"use client";

import type { GelatoTokens } from "@/src/lib/gelato-tokens";
import { Scoop } from "./Scoop";

export type CupProps = {
  tokens: GelatoTokens;
  size: number;
  seed: string;
  className?: string;
};

export function Cup({ tokens, size, seed, className }: CupProps) {
  const pxPerViewBoxUnit = size / 905;
  const desiredCenterX = 453 * pxPerViewBoxUnit;
  const desiredCenterY = 397.368 * pxPerViewBoxUnit;
  const cupScoopDiameterPx = 802 * pxPerViewBoxUnit;
  const scoopDisplayWidth = cupScoopDiameterPx * (629 / 606);
  const scoopDisplayHeight = scoopDisplayWidth * (652 / 629);
  const scoopCenterXInOwnSvg = (306.719 / 629) * scoopDisplayWidth;
  const scoopCenterYInOwnSvg = (303.461 / 652) * scoopDisplayHeight;
  const scoopLeft = desiredCenterX - scoopCenterXInOwnSvg;
  const scoopTop = desiredCenterY - scoopCenterYInOwnSvg;

  return (
    <div
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size * (1100 / 905),
        position: "relative",
      }}
    >
      <svg
        viewBox="0 0 905 1100"
        width={size}
        height={size * (1100 / 905)}
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0 }}
      >
        <ellipse cx="452.5" cy="947.501" rx="429.5" ry="152.5" fill="#1B5E52" />
        <path d="M23 524.615C23 513.182 23 507.466 25.3502 503.623C27.4214 500.236 30.6193 497.774 34.4233 496.639C38.7398 495.35 44.3181 496.827 55.4748 499.78C355.37 579.168 540.045 579.155 849.74 499.466C860.819 496.616 866.358 495.19 870.651 496.495C874.433 497.643 877.612 500.108 879.667 503.484C882 507.317 882 512.992 882 524.342V941.653C882 948.813 882 952.392 880.738 955.379C879.628 958.003 877.815 960.309 875.526 962.005C872.92 963.936 869.429 964.782 862.445 966.475C545.632 1043.27 359.483 1043.09 42.5702 966.466C35.5813 964.776 32.0869 963.931 29.4796 962.001C27.1887 960.305 25.3737 957.999 24.2635 955.373C23 952.386 23 948.804 23 941.64V524.615Z" fill="#1B5E52" />
        <ellipse cx="452.5" cy="482" rx="430.5" ry="133" fill="#F0E4CF" />
      </svg>

      <div
        style={{
          position: "absolute",
          left: scoopLeft,
          top: scoopTop,
          width: scoopDisplayWidth,
          height: scoopDisplayHeight,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <Scoop tokens={tokens} size={scoopDisplayWidth} seed={seed} hideDrips={true} />
      </div>

      <svg
        viewBox="0 0 905 1100"
        width={size}
        height={size * (1100 / 905)}
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, zIndex: 2 }}
      >
        <ellipse cx="452.5" cy="967.283" rx="373.785" ry="132.718" fill="#1B5E52" />
        <path d="M78.7146 603.614C78.7146 592.181 78.7146 586.464 81.0606 582.624C83.1301 579.236 86.3173 576.778 90.12 575.638C94.4307 574.346 100.032 575.819 111.235 578.764C368.36 646.369 528.46 646.343 793.972 578.455C805.101 575.609 810.665 574.186 814.953 575.494C818.733 576.647 821.903 579.108 823.956 582.485C826.285 586.315 826.285 591.991 826.285 603.342V959.596C826.285 966.756 826.285 970.336 825.021 973.324C823.912 975.948 822.094 978.257 819.804 979.952C817.196 981.882 813.716 982.723 806.755 984.404C533.402 1050.42 371.699 1050.27 98.2602 984.395C91.2944 982.717 87.8116 981.878 85.2016 979.948C82.9097 978.253 81.0905 975.943 79.9796 973.318C78.7146 970.329 78.7146 966.747 78.7146 959.583V603.614Z" fill="#1B5E52" />
        <path d="M53.0264 419.019C53.1212 424.546 53.485 429.944 54.1133 435.213C34.0478 449.957 23 466.068 23 482.946C23 553.363 215.294 610.446 452.5 610.446C689.706 610.446 882 553.363 882 482.946C882 466.34 871.305 450.476 851.849 435.927C852.609 431.482 853 426.982 853 422.432C853 421.512 852.982 420.593 852.95 419.676C886.185 442.152 905 467.765 905 494.946C905 584.14 702.409 656.446 452.5 656.446C202.591 656.446 0 584.14 0 494.946C0 467.5 19.1836 441.652 53.0264 419.019Z" fill="#FBF5E8" />
      </svg>
    </div>
  );
}

