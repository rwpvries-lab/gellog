#!/usr/bin/env node
require("dotenv").config({ path: ".env.local" });

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const FLAVOURS = [
  {
    name: "Strawberry",
    slug: "strawberry",
    base: "#F9A8D4",
    shine: "#BC606D",
    accent: "#FFF0F5",
    inclusions: [],
  },
  {
    name: "Pistachio",
    slug: "pistachio",
    base: "#8faf6e",
    shine: "#4a6b35",
    accent: "#f5e6c8",
    inclusions: [],
  },
  {
    name: "Yoghurt Mango",
    slug: "yoghurt-mango",
    base: "#f2c98a",
    shine: "#b5732a",
    accent: "#f7f0e6",
    inclusions: [],
  },
  {
    name: "Cookie Dough",
    slug: "cookie-dough",
    base: "#e8d5a3",
    shine: "#8b6914",
    accent: "#5c3d1e",
    inclusions: [
      { shape: "rect", color: "#3d2000", size: 9 },
      { shape: "rect", color: "#3d2000", size: 7 },
      { shape: "rect", color: "#3d2000", size: 10 },
      { shape: "rect", color: "#3d2000", size: 8 },
      { shape: "rect", color: "#3d2000", size: 8 },
    ],
  },
  {
    name: "Stracciatella",
    slug: "stracciatella",
    base: "#f5f0e8",
    shine: "#c8b89a",
    accent: "#222222",
    inclusions: [
      { shape: "ellipse", color: "#1a1a1a", size: 8 },
      { shape: "ellipse", color: "#1a1a1a", size: 6 },
      { shape: "ellipse", color: "#2a2a2a", size: 10 },
      { shape: "ellipse", color: "#1a1a1a", size: 7 },
      { shape: "ellipse", color: "#2a2a2a", size: 9 },
    ],
  },
  // Add more flavours here as needed
];

const TEMPLATE_BASE_COLOR = "#F9A8D4";
const TEMPLATE_SHINE_COLOR = "#BC606D";
const TEMPLATE_PATHS = {
  cone: path.resolve("public/assets/scoops/templates/cone.svg"),
  cup: path.resolve("public/assets/scoops/templates/cup.svg"),
};
const outputDir = path.resolve("public/assets/scoops");

const TEMPLATE_INCLUSION_BOUNDS = {
  cone: {
    cx: 293.414,
    cy: 290.294,
    rx: 290.294,
    ry: 290.294,
  },
  cup: {
    cx: 453,
    cy: 397.368,
    rx: 401,
    ry: 397.368,
  },
};

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function hash() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createSeededRandom(seedText) {
  const seedFn = xmur3(seedText);
  return mulberry32(seedFn());
}

function randomPointWithinSafeZone(random, bounds) {
  const theta = random() * Math.PI * 2;
  const radiusScale = Math.sqrt(random()) * 0.75;
  return {
    x: bounds.cx + Math.cos(theta) * bounds.rx * radiusScale,
    y: bounds.cy + Math.sin(theta) * bounds.ry * radiusScale,
  };
}

function inclusionToSvg(inclusion, random, bounds) {
  const { x, y } = randomPointWithinSafeZone(random, bounds);
  const size = inclusion.size;

  if (inclusion.shape === "rect") {
    const rotation = random() * 60 - 30;
    const half = size / 2;
    return `<rect x="${(x - half).toFixed(3)}" y="${(y - half).toFixed(3)}" width="${size}" height="${size}" rx="3" fill="${inclusion.color}" transform="rotate(${rotation.toFixed(2)} ${x.toFixed(3)} ${y.toFixed(3)})"/>`;
  }

  if (inclusion.shape === "ellipse") {
    const rotation = random() * 90 - 45;
    const rx = (size / 2).toFixed(3);
    const ry = Math.max(size * 0.35, 2).toFixed(3);
    return `<ellipse cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" rx="${rx}" ry="${ry}" fill="${inclusion.color}" transform="rotate(${rotation.toFixed(2)} ${x.toFixed(3)} ${y.toFixed(3)})"/>`;
  }

  const radius = (size / 2).toFixed(3);
  return `<circle cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="${radius}" fill="${inclusion.color}"/>`;
}

function buildInclusionsSvg(flavour, bounds, variant) {
  const random = createSeededRandom(`${flavour.slug}-${variant}`);
  return flavour.inclusions
    .map((inclusion) => inclusionToSvg(inclusion, random, bounds))
    .join("\n");
}

function injectInclusions(svg, inclusionMarkup) {
  if (!inclusionMarkup) return svg;

  const shineMatch = svg.match(new RegExp(`stroke=["']${TEMPLATE_SHINE_COLOR}["']`, "i"));
  const shineStartIndex = shineMatch ? shineMatch.index ?? -1 : -1;
  if (shineStartIndex === -1) {
    return svg.replace("</svg>", `${inclusionMarkup}\n</svg>`);
  }

  return `${svg.slice(0, shineStartIndex)}${inclusionMarkup}\n${svg.slice(shineStartIndex)}`;
}

function recolorTemplate(svg, flavour) {
  return svg
    .replaceAll(new RegExp(TEMPLATE_BASE_COLOR, "gi"), flavour.base)
    .replaceAll(new RegExp(TEMPLATE_SHINE_COLOR, "gi"), flavour.shine);
}

async function upsertFlavours() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars."
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  for (const flavour of FLAVOURS) {
    const payload = {
      name: flavour.name,
      slug: flavour.slug,
      base_color: flavour.base,
      shine_color: flavour.shine,
      accent_color: flavour.accent,
      inclusions: flavour.inclusions,
      cone_url: `/assets/scoops/${flavour.slug}-cone.svg`,
      cup_url: `/assets/scoops/${flavour.slug}-cup.svg`,
      source: "system",
    };

    const { error } = await supabase
      .from("flavours")
      .upsert(payload, { onConflict: "slug" });

    if (error) {
      console.error(`[DB] ${flavour.slug} failed: ${error.message}`);
    } else {
      console.log(`[DB] ${flavour.slug} upserted`);
    }
  }
}

async function main() {
  for (const [variant, templatePath] of Object.entries(TEMPLATE_PATHS)) {
    if (!fs.existsSync(templatePath)) {
      throw new Error(`${variant} template SVG not found at ${templatePath}`);
    }
  }

  const templates = {
    cone: fs.readFileSync(TEMPLATE_PATHS.cone, "utf8"),
    cup: fs.readFileSync(TEMPLATE_PATHS.cup, "utf8"),
  };

  fs.mkdirSync(outputDir, { recursive: true });

  for (const flavour of FLAVOURS) {
    for (const variant of ["cone", "cup"]) {
      const template = templates[variant];
      const recolored = recolorTemplate(template, flavour);
      const inclusionMarkup = buildInclusionsSvg(
        flavour,
        TEMPLATE_INCLUSION_BOUNDS[variant],
        variant
      );
      const svgWithInclusions = injectInclusions(recolored, inclusionMarkup);
      const outputPath = path.join(outputDir, `${flavour.slug}-${variant}.svg`);

      fs.writeFileSync(outputPath, svgWithInclusions, "utf8");
      console.log(`[SVG] wrote ${outputPath}`);
    }
  }

  await upsertFlavours();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
