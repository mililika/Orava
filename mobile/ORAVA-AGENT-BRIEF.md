# Task: add the Orava squirrel mascot to this app

You are adding an animated SVG mascot called **Orava** to this React app. Orava is a
squirrel coach that floats over the home screen; its mood mirrors the user's financial
health, and it reacts to unusual-payment alerts.

Do the steps below in order. Do not redesign the squirrel or change its SVG paths.

---

## Step 1 — Create the component

Create the file `src/components/Orava.jsx` with **exactly** this content:

```jsx
import React, { useRef, useState, useEffect } from 'react';

/**
 * Orava — animated squirrel mascot.
 *
 *   <Orava mood="happy" size={220} onClick={() => ...} />
 *
 * mood: "happy" | "okay" | "worried" | "alert"
 * Everything (markup + animation CSS) is self-contained. No dependencies.
 */

const CSS = `
.orava *{transform-box:fill-box}
.orava .cheek{transition:opacity .3s}
.orava .bob{transform-origin:50% 100%;animation:o-bob 2.6s ease-in-out infinite}
.orava .shadow{transform-origin:center;animation:o-shadow 2.6s ease-in-out infinite;fill:#1E2A23;opacity:.12}
.orava .tail{transform-origin:12% 95%;animation:o-sway 2.6s ease-in-out infinite}
.orava .ear-l{transform-origin:60% 100%;animation:o-twitch 5s ease-in-out infinite}
.orava .ear-r{transform-origin:40% 100%;animation:o-twitch 5s ease-in-out 1.3s infinite reverse}
.orava .eye{transform-origin:center;animation:o-blink 4.2s infinite}
.orava .look{animation:o-look 7s ease-in-out infinite}
.orava .head{transform-origin:50% 90%;transition:transform .4s}
.orava .acorn{transform-origin:50% 80%}
.orava .fx>*, .orava .mouth, .orava .brow, .orava .eyes-happy, .orava .ring{opacity:0;transition:opacity .3s}
.orava .eyes{transition:opacity .2s}

/* happy */
.orava.mood-happy .bob,.orava.mood-happy .shadow{animation-duration:.9s}
.orava.mood-happy .bob{animation-name:o-bounce}
.orava.mood-happy .tail{animation:o-wag 1s ease-in-out infinite}
.orava.mood-happy .m-happy,.orava.mood-happy .eyes-happy{opacity:1}
.orava.mood-happy .eyes{opacity:0}
.orava.mood-happy .cheek{opacity:.85}
.orava.mood-happy .spark{opacity:1;animation:o-twinkle 1.6s ease-in-out infinite}
.orava.mood-happy .spark:nth-child(2){animation-delay:.5s}
.orava.mood-happy .spark:nth-child(3){animation-delay:1s}
.orava.mood-happy .acorn{animation:o-nibble .9s ease-in-out infinite}

/* okay */
.orava.mood-okay .m-okay{opacity:1}

/* worried */
.orava.mood-worried .bob,.orava.mood-worried .shadow{animation-duration:3.8s}
.orava.mood-worried .tail{animation:o-droop 3.8s ease-in-out infinite}
.orava.mood-worried .head{transform:rotate(-7deg)}
.orava.mood-worried .m-worried,.orava.mood-worried .b-worried{opacity:1}
.orava.mood-worried .sweat{opacity:1;animation:o-sweat 2.2s ease-in infinite}
.orava.mood-worried .look{animation:o-glance 3s ease-in-out infinite}

/* alert */
.orava.mood-alert .bob{animation:o-shake .5s ease-in-out infinite}
.orava.mood-alert .tail{animation:o-bristle .25s ease-in-out infinite}
.orava.mood-alert .ear-l,.orava.mood-alert .ear-r{animation:o-perk .5s ease-in-out infinite alternate}
.orava.mood-alert .m-alert,.orava.mood-alert .b-alert{opacity:1}
.orava.mood-alert .exclaim{opacity:1;animation:o-pop .6s ease-in-out infinite alternate}
.orava.mood-alert .ring{opacity:1;animation:o-pulse 1.2s ease-out infinite}
.orava.mood-alert .eye{animation:none;transform:scale(1.15)}

/* click hop */
.orava.hop .bob{animation:o-hop .7s cubic-bezier(.3,.7,.4,1) 1!important}
.orava.hop .shadow{animation:o-hopshadow .7s ease 1!important}

@keyframes o-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes o-bounce{0%,100%{transform:translateY(0) scale(1.02,.98)}50%{transform:translateY(-11px) scale(.98,1.02)}}
@keyframes o-shadow{0%,100%{transform:scale(1)}50%{transform:scale(.86)}}
@keyframes o-sway{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(4deg)}}
@keyframes o-wag{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(9deg)}}
@keyframes o-droop{0%,100%{transform:rotate(14deg)}50%{transform:rotate(18deg)}}
@keyframes o-bristle{0%,100%{transform:rotate(-2deg) scale(1.08)}50%{transform:rotate(2deg) scale(1.12)}}
@keyframes o-twitch{0%,86%,100%{transform:rotate(0)}89%{transform:rotate(-14deg)}92%{transform:rotate(4deg)}95%{transform:rotate(0)}}
@keyframes o-perk{from{transform:rotate(-4deg) translateY(-2px)}to{transform:rotate(4deg) translateY(-4px)}}
@keyframes o-blink{0%,93%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes o-look{0%,25%,100%{transform:translate(0,0)}32%,48%{transform:translate(3px,-1px)}56%,72%{transform:translate(-3px,1px)}80%{transform:translate(0,0)}}
@keyframes o-glance{0%,100%{transform:translate(-3px,2px)}50%{transform:translate(2px,2px)}}
@keyframes o-twinkle{0%,100%{transform:scale(.4) rotate(0);opacity:.2}50%{transform:scale(1.1) rotate(45deg);opacity:1}}
@keyframes o-nibble{0%,100%{transform:rotate(0)}25%{transform:rotate(-8deg) translateY(-2px)}75%{transform:rotate(8deg) translateY(-2px)}}
@keyframes o-sweat{0%{transform:translateY(-4px);opacity:0}20%{opacity:1}100%{transform:translateY(16px);opacity:0}}
@keyframes o-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px) rotate(-1.5deg)}75%{transform:translateX(3px) rotate(1.5deg)}}
@keyframes o-pop{from{transform:translateY(0) scale(1)}to{transform:translateY(-6px) scale(1.12)}}
@keyframes o-pulse{0%{transform:scale(.7);opacity:.6}100%{transform:scale(1.15);opacity:0}}
@keyframes o-hop{0%{transform:translateY(0) scale(1.08,.9)}25%{transform:translateY(-34px) scale(.94,1.08)}55%{transform:translateY(0) scale(1.1,.88)}75%{transform:translateY(-7px) scale(1)}100%{transform:translateY(0)}}
@keyframes o-hopshadow{0%,55%,100%{transform:scale(1)}25%{transform:scale(.55)}}
@media (prefers-reduced-motion:reduce){.orava *{animation:none!important}}
`;

/** Inject the stylesheet once per page, no matter how many Oravas are mounted. */
function useOravaStyles() {
  useEffect(() => {
    if (document.getElementById('orava-styles')) return;
    const el = document.createElement('style');
    el.id = 'orava-styles';
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);
}

/** Map a 0–100 financial health score to a mood. */
export function moodFromScore(score) {
  if (score >= 70) return 'happy';
  if (score >= 40) return 'okay';
  return 'worried';
}

export default function Orava({
  mood = 'okay',
  size = 220,
  hopOnClick = true,
  onClick,
  className = '',
  style,
  title = 'Orava',
}) {
  useOravaStyles();
  const [hopping, setHopping] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  function handleClick(e) {
    if (hopOnClick) {
      setHopping(false);
      // next frame, so the animation can restart
      requestAnimationFrame(() => {
        setHopping(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setHopping(false), 720);
      });
    }
    onClick?.(e);
  }

  return (
    <svg
      className={`orava mood-${mood}${hopping ? ' hop' : ''} ${className}`}
      viewBox="0 0 220 230"
      width={size}
      height={size ? (size * 230) / 220 : undefined}
      role="img"
      aria-label={title}
      onClick={handleClick}
      style={{ cursor: hopOnClick || onClick ? 'pointer' : undefined, ...style }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g className="ring">
        <circle cx="110" cy="128" r="96" fill="none" stroke="#C8323A" strokeWidth="6" />
      </g>
      <ellipse className="shadow" cx="104" cy="216" rx="54" ry="7" />
      <g className="bob">
        <g className="tail">
          <path d="M110,192 C150,204 210,168 202,108 C196,58 160,26 128,40 C98,53 100,94 128,94 C143,94 150,80 141,71 C163,82 172,120 152,148 C139,165 116,170 110,192 Z" fill="#C45A1C" />
          <path d="M128,52 C155,46 186,72 188,110 C190,140 170,166 140,176" fill="none" stroke="#E98E45" strokeWidth="7" strokeLinecap="round" opacity=".8" />
        </g>
        <ellipse cx="78" cy="204" rx="15" ry="7" fill="#C45A1C" />
        <ellipse cx="116" cy="204" rx="15" ry="7" fill="#C45A1C" />
        <ellipse cx="97" cy="166" rx="40" ry="40" fill="#E07A2E" />
        <ellipse cx="96" cy="174" rx="24" ry="28" fill="#F8E1BF" />
        <g className="head">
          <g className="ear-l">
            <path d="M64,82 L56,42 L88,68 Z" fill="#E07A2E" />
            <path d="M66,74 L61,52 L79,67 Z" fill="#F2A78A" />
            <path d="M56,42 L52,32 M56,42 L60,31" stroke="#C45A1C" strokeWidth="3" strokeLinecap="round" />
          </g>
          <g className="ear-r">
            <path d="M110,66 L134,38 L128,80 Z" fill="#E07A2E" />
            <path d="M114,67 L130,48 L126,74 Z" fill="#F2A78A" />
            <path d="M134,38 L134,27 M134,38 L142,30" stroke="#C45A1C" strokeWidth="3" strokeLinecap="round" />
          </g>
          <circle cx="95" cy="100" r="38" fill="#E07A2E" />
          <ellipse cx="95" cy="113" rx="26" ry="19" fill="#F8E1BF" />
          <circle className="cheek" cx="69" cy="112" r="6.5" fill="#F07C6B" opacity=".5" />
          <circle className="cheek" cx="121" cy="112" r="6.5" fill="#F07C6B" opacity=".5" />
          <g className="eyes">
            <g className="look">
              <g className="eye">
                <ellipse cx="80" cy="96" rx="7" ry="8.5" fill="#2B1B12" />
                <circle cx="82.5" cy="92.5" r="2.4" fill="#fff" />
              </g>
              <g className="eye">
                <ellipse cx="110" cy="96" rx="7" ry="8.5" fill="#2B1B12" />
                <circle cx="112.5" cy="92.5" r="2.4" fill="#fff" />
              </g>
            </g>
          </g>
          <g className="eyes-happy" fill="none" stroke="#2B1B12" strokeWidth="4" strokeLinecap="round">
            <path d="M73,98 Q80,88 87,98" />
            <path d="M103,98 Q110,88 117,98" />
          </g>
          <g fill="none" stroke="#5A3420" strokeWidth="3.2" strokeLinecap="round">
            <g className="brow b-worried">
              <path d="M71,85 L86,80" />
              <path d="M119,85 L104,80" />
            </g>
            <g className="brow b-alert">
              <path d="M71,82 Q79,74 87,80" />
              <path d="M103,80 Q111,74 119,82" />
            </g>
          </g>
          <ellipse cx="95" cy="107" rx="5.5" ry="3.8" fill="#3A2418" />
          <g fill="none" stroke="#3A2418" strokeWidth="3" strokeLinecap="round">
            <g className="mouth m-happy">
              <path d="M85,114 Q95,126 105,114" />
            </g>
            <g className="mouth m-okay">
              <path d="M88,116 Q95,120 102,116" />
            </g>
            <g className="mouth m-worried">
              <path d="M86,122 Q95,114 104,122" />
            </g>
          </g>
          <g className="mouth m-alert">
            <ellipse cx="95" cy="119" rx="4.5" ry="5.5" fill="#3A2418" />
          </g>
        </g>
        <g className="acorn">
          <rect x="94" y="133" width="3" height="6" rx="1.5" fill="#5A3420" />
          <ellipse cx="96" cy="153" rx="9.5" ry="11" fill="#B9773A" />
          <ellipse cx="96" cy="143" rx="12" ry="6" fill="#7A4A25" />
          <ellipse cx="84" cy="152" rx="7" ry="6" fill="#E07A2E" stroke="#C45A1C" strokeWidth="2" />
          <ellipse cx="108" cy="152" rx="7" ry="6" fill="#E07A2E" stroke="#C45A1C" strokeWidth="2" />
        </g>
      </g>
      <g className="fx">
        <path className="spark" d="M34,62 l4,10 l10,4 l-10,4 l-4,10 l-4,-10 l-10,-4 l10,-4 Z" fill="#F2C14E" />
        <path className="spark" d="M178,30 l3,8 l8,3 l-8,3 l-3,8 l-3,-8 l-8,-3 l8,-3 Z" fill="#F2C14E" />
        <path className="spark" d="M28,150 l3,7 l7,3 l-7,3 l-3,7 l-3,-7 l-7,-3 l7,-3 Z" fill="#7BC89A" />
        <path className="sweat" d="M136,72 C136,72 128,84 128,89 C128,94 132,97 136,97 C140,97 144,94 144,89 C144,84 136,72 136,72 Z" fill="#7CC4EA" stroke="#3E8FBF" strokeWidth="1.5" />
        <g className="exclaim">
          <circle cx="160" cy="34" r="17" fill="#C8323A" />
          <rect x="157" y="22" width="6" height="16" rx="3" fill="#fff" />
          <circle cx="160" cy="44" r="3.3" fill="#fff" />
        </g>
      </g>
    </svg>
  );
}
```

## Step 2 — Figure out where the mascot belongs

Find the component that renders the app's home screen (the one with the balance and the
transaction list). Orava is rendered there, as a floating circular button pinned to the
bottom-right corner, above the rest of the content.

If the app already has a chat panel or a bottom sheet for the finance agent, the button
toggles it. If it does not, make the button call an `onOpen` prop and leave wiring the
panel to the caller — do not invent a chat UI.

## Step 3 — Add the floating button

Add this to the home screen component. Match the surrounding code's styling approach
(CSS modules, Tailwind, styled-components, plain inline styles — whatever is already
used in this project); the inline styles below are only a reference for the geometry.

```jsx
import Orava, { moodFromScore } from '../components/Orava';

// `health` comes from the finance agent: { score: number, alert: boolean }
const mood = health?.alert ? 'alert' : moodFromScore(health?.score ?? 50);

<button
  onClick={onOpen}
  aria-label="Open Orava"
  style={{
    position: 'fixed', right: 16, bottom: 24, zIndex: 50,
    width: 88, height: 88, borderRadius: '50%', padding: 4,
    background: '#fff',
    border: `3px solid ${mood === 'alert' ? '#C8323A' : '#C98A2B'}`,
    boxShadow: '0 10px 24px -8px rgba(0,0,0,.35)', cursor: 'pointer',
  }}
>
  <Orava mood={mood} size={76} hopOnClick={false} />
</button>
```

## Step 4 — Connect it to the agent

The mascot is driven by one value. Wherever the app holds the finance agent's state, make
sure a health object shaped `{ score, alert }` is available to the home screen:

- `score` is 0–100. `moodFromScore` maps it: 70+ → `happy`, 40–69 → `okay`, below 40 → `worried`.
- `alert` is `true` when the agent has flagged an unusual payment. It overrides the score
  and puts Orava in the `alert` mood (shaking, puffed tail, pulsing red ring, "!" badge).

If the backend is not ready yet, hard-code `{ score: 60, alert: false }` with a `TODO`
comment rather than inventing an endpoint.

---

## Component API, for reference

| prop | type | default | effect |
|---|---|---|---|
| `mood` | `"happy" \| "okay" \| "worried" \| "alert"` | `"okay"` | which animation set runs |
| `size` | number (px) | `220` | width; height scales to match |
| `hopOnClick` | boolean | `true` | hop animation on click |
| `onClick` | function | — | click handler |
| `className`, `style`, `title` | — | — | passed to the `<svg>` |

Named export `moodFromScore(score)` returns a mood string.

## Constraints

- No new dependencies. The component is plain React plus inline SVG.
- Do not extract the SVG into an `.svg` file or an `<img>`; the mood classes must stay on
  the live DOM for the CSS animations to work.
- The animation CSS is injected into `<head>` once, under the id `orava-styles`. Do not
  move it into a global stylesheet.
- Works with both the classic and the automatic JSX runtime; leave the `React` import in place.

## Done when

1. The app builds with no new warnings.
2. The squirrel appears bottom-right on the home screen and is animated.
3. Changing the score across 40 and 70 visibly changes its mood.
4. Setting `alert: true` makes it shake with the red ring and "!" badge.
5. Clicking the button opens the agent panel (or calls `onOpen`).
