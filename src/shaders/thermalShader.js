/**
 * ═══════════════════════════════════════════════════════════════════════
 * FLIR THERMAL & NIGHT VISION SHADERS FOR TRISHUL-SIM
 * Adapted from tactical military specs with White-Hot, Black-Hot & Ironbow
 * ═══════════════════════════════════════════════════════════════════════
 */

export const FLIR_MODES = {
  WHITE_HOT: 'WHITE_HOT',
  BLACK_HOT: 'BLACK_HOT',
  IRONBOW: 'IRONBOW',
  NVG_GREEN: 'NVG_GREEN'
};

export const thermalFragmentShader = `
  uniform sampler2D tDiffuse;
  uniform float time;
  uniform float mode; // 0: White-Hot, 1: Black-Hot, 2: Ironbow, 3: NVG Green
  uniform float sensitivity;
  uniform float scanlines;
  uniform vec2 resolution;
  varying vec2 vUv;

  // Classic FLIR Ironbow color ramp
  vec3 ironbow(float t) {
    t = clamp(t, 0.0, 1.0);
    const vec3 c0 = vec3(0.0, 0.0, 0.0);     // Cold black
    const vec3 c1 = vec3(0.15, 0.0, 0.35);   // Deep violet
    const vec3 c2 = vec3(0.55, 0.0, 0.50);   // Magenta
    const vec3 c3 = vec3(0.90, 0.15, 0.18);  // Crimson
    const vec3 c4 = vec3(1.0, 0.60, 0.0);    // Amber orange
    const vec3 c5 = vec3(1.0, 0.95, 0.35);   // Yellow
    const vec3 c6 = vec3(1.0, 1.0, 1.0);     // Hot white
    float s = t * 6.0;
    if (s < 1.0) return mix(c0, c1, s);
    if (s < 2.0) return mix(c1, c2, s - 1.0);
    if (s < 3.0) return mix(c2, c3, s - 2.0);
    if (s < 4.0) return mix(c3, c4, s - 3.0);
    if (s < 5.0) return mix(c4, c5, s - 4.0);
    return mix(c5, c6, s - 5.0);
  }

  // Hash pseudo-random noise for thermal sensor grain
  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    
    // Perceived thermal luminance
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    lum = clamp((lum - 0.1) * (1.0 + sensitivity), 0.0, 1.0);
    
    // Subtle sensor noise
    float noise = (hash(vUv * 800.0 + fract(time * 30.0)) - 0.5) * 0.06;
    lum = clamp(lum + noise, 0.0, 1.0);

    vec3 finalColor;
    if (mode < 0.5) {
      // 0: White-Hot (Hot is bright, cold is dark)
      finalColor = vec3(lum);
    } else if (mode < 1.5) {
      // 1: Black-Hot (Hot is dark, cold is bright)
      finalColor = vec3(1.0 - lum);
    } else if (mode < 2.5) {
      // 2: Ironbow Predator Thermal Ramp
      finalColor = ironbow(lum);
    } else {
      // 3: PVS-14 NVG Phosphor Green
      finalColor = vec3(lum * 0.2, lum * 1.0, lum * 0.4);
    }

    // Horizontal scanline bands
    if (scanlines > 0.1) {
      float scan = sin(vUv.y * resolution.y * 1.5) * 0.06;
      finalColor -= scan;
    }

    // Vignette
    vec2 uvCentered = vUv * 2.0 - 1.0;
    float vig = 1.0 - dot(uvCentered, uvCentered) * 0.25;
    finalColor *= clamp(vig, 0.0, 1.0);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
