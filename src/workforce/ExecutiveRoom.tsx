import { useId } from "react";

/** Architectural illustration: the interactive work surfaces are real HTML above it. */
export function ExecutiveRoom() {
  const uid = useId().replace(/:/g, "");
  const paint = (name: string) => `url(#${uid}-${name})`;
  return (
    <svg
      className="hq-architecture"
      viewBox="0 0 1600 1000"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${uid}-wall`} x2="0" y2="1">
          <stop stopColor="#14191c" />
          <stop offset=".65" stopColor="#2d3031" />
          <stop offset="1" stopColor="#141719" />
        </linearGradient>
        <linearGradient id={`${uid}-floor`} x2="0" y2="1">
          <stop stopColor="#151b20" />
          <stop offset="1" stopColor="#353c40" />
        </linearGradient>
        <linearGradient id={`${uid}-ceiling`} x2="0" y2="1">
          <stop stopColor="#0a1014" />
          <stop offset="1" stopColor="#343a3c" />
        </linearGradient>
        <linearGradient id={`${uid}-glass`}>
          <stop stopColor="#9bb4bb" stopOpacity=".05" />
          <stop offset=".5" stopColor="#d6ecea" stopOpacity=".13" />
          <stop offset="1" stopColor="#9bb4bb" stopOpacity=".02" />
        </linearGradient>
        <radialGradient id={`${uid}-light`}>
          <stop stopColor="#e6ac71" stopOpacity=".23" />
          <stop offset="1" stopColor="#dd8c40" stopOpacity="0" />
        </radialGradient>
        <pattern
          id={`${uid}-grain`}
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
        >
          <path d="M0 0V7" stroke="#fff" strokeOpacity=".025" />
        </pattern>
        <filter
          id={`${uid}-glow`}
          x="-100%"
          y="-100%"
          width="300%"
          height="300%"
        >
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <path d="M0 0H1600V1000H0Z" fill="#12181b" />
      <path d="M0 0H1600L1260 210H340Z" fill={paint("ceiling")} />
      <path d="M340 210H1260V610H340Z" fill={paint("wall")} />
      <path d="M0 0L340 210V610L0 1000Z" fill="#1c2429" />
      <path d="M1600 0L1260 210V610L1600 1000Z" fill="#1b2327" />
      <path d="M340 610H1260L1600 1000H0Z" fill={paint("floor")} />
      <path
        d="M45 34H1555L1244 226H356Z"
        fill="none"
        stroke="#e49d5b"
        strokeWidth="10"
        opacity=".28"
        filter={paint("glow")}
      />
      <path
        d="M45 34H1555L1244 226H356Z"
        fill="none"
        stroke="#e7ac6e"
        strokeWidth="3"
      />
      <path
        d="M110 30L390 186H1210L1490 30"
        fill="none"
        stroke="#5d6261"
        strokeWidth="2"
      />
      {[480, 800, 1120].map((x) => (
        <g key={x}>
          <path d={`M${x - 120} 80h240`} stroke="#596267" strokeWidth="6" />
          <path d={`M${x - 105} 81h210`} stroke="#e7e4d2" strokeWidth="2" />
        </g>
      ))}
      <ellipse cx="800" cy="385" rx="560" ry="280" fill={paint("light")} />
      <path d="M490 240H1110V590H490Z" fill="#252a2c" stroke="#46433a" />
      <path d="M490 240H1110V590H490Z" fill={paint("grain")} />
      {Array.from({ length: 17 }, (_, i) => (
        <path
          key={i}
          d={`M${510 + i * 35} 245V585`}
          stroke="#7f8075"
          strokeOpacity=".12"
        />
      ))}
      <text
        x="800"
        y="342"
        textAnchor="middle"
        fill="#d29a5b"
        fontSize="65"
        fontFamily="Outfit, sans-serif"
        fontWeight="600"
        letterSpacing="-3"
      >
        oneShot
      </text>
      <text
        x="800"
        y="342"
        textAnchor="middle"
        fill="#e4a666"
        opacity=".32"
        filter={paint("glow")}
        fontSize="65"
        fontFamily="Outfit, sans-serif"
      >
        oneShot
      </text>
      <text
        x="800"
        y="375"
        textAnchor="middle"
        fill="#a99d87"
        fontSize="10"
        letterSpacing="6"
      >
        EXECUTIVE HEADQUARTERS
      </text>
      {[355, 1135].map((x) => (
        <g key={x}>
          <rect
            x={x}
            y="270"
            width="110"
            height="316"
            rx="2"
            fill="#12191e"
            stroke="#686052"
          />
          {[0, 1, 2, 3].map((r) => (
            <g key={r}>
              <path d={`M${x + 8} ${330 + r * 65}h94`} stroke="#645645" />
              {[0, 1, 2, 3, 4].map((b) => (
                <rect
                  key={b}
                  x={x + 15 + b * 16}
                  y={285 + r * 65}
                  width="10"
                  height="40"
                  fill={b % 2 ? "#3d4547" : "#756a53"}
                />
              ))}
              <path
                d={`M${x + 8} ${331 + r * 65}h94`}
                stroke="#d39b5a"
                strokeOpacity=".45"
              />
            </g>
          ))}
        </g>
      ))}
      {[0, 1].map((side) => (
        <g
          key={side}
          transform={side ? "translate(1600 0) scale(-1 1)" : undefined}
        >
          <path
            d="M70 220L303 320V638L70 800Z"
            fill={paint("glass")}
            stroke="#68787d"
            strokeOpacity=".45"
          />
          <path
            d="M184 270V720M70 500L303 475"
            stroke="#8f9b9f"
            strokeOpacity=".3"
          />
          <path d="M90 250L120 268V742L90 765Z" fill="#e6e9df" opacity=".025" />
          <path d="M100 775L280 650" stroke="#c98c50" strokeWidth="3" />
          <path d="M35 110L320 270" stroke="#e5b47f" strokeWidth="2" />
        </g>
      ))}
      {[400, 600, 1000, 1200].map((x) => (
        <path
          key={x}
          d={`M${x} 610L${800 + (x - 800) * 3.5} 1000`}
          stroke="#bbc8c9"
          strokeOpacity=".07"
        />
      ))}
      {[680, 790, 930].map((y) => (
        <path key={y} d={`M0 ${y}H1600`} stroke="#c0c8c9" strokeOpacity=".06" />
      ))}
      <path
        d="M600 640L420 900H125L45 970M1000 640L1180 900H1475L1555 970"
        fill="none"
        stroke="#dc944e"
        strokeWidth="3"
        opacity=".8"
      />
      <path
        d="M600 648L430 903M1000 648L1170 903"
        fill="none"
        stroke="#ea9d55"
        strokeWidth="13"
        opacity=".06"
      />
      <ellipse cx="800" cy="980" rx="310" ry="45" fill="#060b0e" opacity=".6" />
      <path
        d="M560 923Q800 886 1040 923L1110 1000H490Z"
        fill="#1a2327"
        stroke="#71776d"
      />
      <path
        d="M560 923Q800 886 1040 923"
        fill="none"
        stroke="#d5ae7c"
        strokeWidth="2"
      />
    </svg>
  );
}

export function ExecutivePerson({ variant = 0 }: { variant?: number }) {
  const skin = ["#bc9175", "#9e7057", "#d6af91", "#805b49"][variant % 4];
  return (
    <svg viewBox="0 0 180 220" aria-hidden="true" className="hq-person">
      <ellipse cx="90" cy="205" rx="70" ry="12" fill="#0b1115" opacity=".5" />
      <rect
        x="42"
        y="51"
        width="96"
        height="150"
        rx="23"
        fill="#11181e"
        stroke="#484b4b"
      />
      <path
        d="M52 74Q90 61 128 74M49 112H131M48 153H132"
        fill="none"
        stroke="#30383d"
      />
      <path
        d="M64 93L45 106Q31 136 29 183L52 188L65 143V207H118V143L131 188L153 182Q149 135 132 106L111 93Z"
        fill="#303b47"
        stroke="#171e25"
      />
      <path d="M70 94L90 149L111 94L101 91H80Z" fill="#e0ded5" />
      <path
        d="M86 104L94 104L100 154L90 165L82 153Z"
        fill={variant % 2 ? "#64443a" : "#26384b"}
      />
      <path
        d="M65 95L83 143L65 131L59 113ZM113 95L98 143L117 131L121 111Z"
        fill="#46515c"
      />
      <path d="M78 78H104V101Q92 112 78 101Z" fill={skin} />
      <path
        d="M67 47Q66 20 91 19Q119 20 116 49L111 78Q91 100 73 78Z"
        fill={skin}
      />
      <path
        d="M67 53Q56 18 86 12Q122 7 118 49L110 42L106 29Q87 42 70 39Z"
        fill="#242120"
      />
      <path d="M73 52L84 51M97 51L108 52" stroke="#493b32" strokeWidth="2" />
      <path
        d="M90 53L87 67L94 68M83 78Q91 81 100 77"
        fill="none"
        stroke="#785341"
      />
      <circle cx="79" cy="55" r="1.8" fill="#22272a" />
      <circle cx="103" cy="55" r="1.8" fill="#22272a" />
      <path
        d="M30 181Q41 170 55 182L75 188L71 199L44 195Z M151 181Q139 171 127 183L109 188L113 199L138 195Z"
        fill={skin}
      />
      <path d="M90 165V207M64 161H78M104 161H117" stroke="#5a6269" />
      <path d="M112 111H124L124 115H112Z" fill="#b59872" />
    </svg>
  );
}
