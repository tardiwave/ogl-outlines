precision highp float;

  uniform bool uIsNormalRender;

varying vec3 vNormal;
varying vec2 vUv;

void main() {
  vec3 normal = normalize(vNormal);
  float lighting = dot(normal, normalize(vec3(-0.3, 0.8, 0.6)));

  gl_FragColor.rgb = vec3(0.2, 0.8, 1.0) + lighting * 0.1;

  if (uIsNormalRender){
    gl_FragColor.rgb = normal * 0.5 + 0.5;
  }

  gl_FragColor.a = 1.0;
}