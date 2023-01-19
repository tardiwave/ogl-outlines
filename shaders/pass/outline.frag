precision highp float;

uniform sampler2D tNormalMap;
uniform sampler2D tDepthMap;
uniform float uCameraNear;
uniform float uCameraFar;
uniform mat4 viewMatrix;
uniform vec4 uScreenSize;
uniform vec3 uOutlineColor;
uniform vec2 uMultiplierParameters;

varying vec3 vNormal;
varying vec2 vUv;

float perspectiveDepthToViewZ( const in float invClipZ, const in float near, const in float far ) {
  return ( near * far ) / ( ( far - near ) * invClipZ - far );
}

float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}

// Helper functions for reading from depth buffer.
float readDepth (sampler2D depthSampler, vec2 coord) {
  float fragCoordZ = texture2D(depthSampler, coord).x;
  float viewZ = perspectiveDepthToViewZ( fragCoordZ, uCameraNear, uCameraFar );
  return viewZToOrthographicDepth( viewZ, uCameraNear, uCameraFar );
}

float getLinearDepth(vec3 pos) {
  return -(viewMatrix * vec4(pos, 1.0)).z;
}

float getLinearScreenDepth(sampler2D map) {
    vec2 uv = gl_FragCoord.xy * uScreenSize.zw;
    return readDepth(map,vUv);
}

// Helper functions for reading normals and depth of neighboring pixels.
float getPixelDepth(int x, int y) {
  // uScreenSize.zw is pixel size 
  // vUv is current position
  return readDepth(tDepthMap, vUv + uScreenSize.zw * vec2(x, y));
}

// "surface value" is either the normal or the "surfaceID"
vec3 getSurfaceValue(int x, int y) {
  vec3 val = texture2D(tNormalMap, vUv + uScreenSize.zw * vec2(x, y)).rgb;
  return val;
}

float saturateValue(float num) {
  return clamp(num, 0.0, 1.0);
}

float getSufaceIdDiff(vec3 surfaceValue) {
  float surfaceIdDiff = 0.0;
  surfaceIdDiff += distance(surfaceValue, getSurfaceValue(1, 0));
  surfaceIdDiff += distance(surfaceValue, getSurfaceValue(0, 1));
  surfaceIdDiff += distance(surfaceValue, getSurfaceValue(0, 1));
  surfaceIdDiff += distance(surfaceValue, getSurfaceValue(0, -1));
  surfaceIdDiff += distance(surfaceValue, getSurfaceValue(1, 1));
  surfaceIdDiff += distance(surfaceValue, getSurfaceValue(1, -1));
  surfaceIdDiff += distance(surfaceValue, getSurfaceValue(-1, 1));
  surfaceIdDiff += distance(surfaceValue, getSurfaceValue(-1, -1));
  return surfaceIdDiff;
}

void main() {
  float depth = getPixelDepth(0, 0);
  vec3 surfaceValue = getSurfaceValue(0, 0);

  float depthDiff = 0.0;
  depthDiff += abs(depth - getPixelDepth(1, 0));
  depthDiff += abs(depth - getPixelDepth(-1, 0));
  depthDiff += abs(depth - getPixelDepth(0, 1));
  depthDiff += abs(depth - getPixelDepth(0, -1));

  // Get the difference between surface values of neighboring pixels and current
  float surfaceValueDiff = getSufaceIdDiff(surfaceValue);

  // Apply multiplier & bias to each 
  float depthBias = uMultiplierParameters.x;
  float depthMultiplier = uMultiplierParameters.y;

  depthDiff = depthDiff * depthMultiplier;
  depthDiff = saturateValue(depthDiff);
  depthDiff = pow(depthDiff, depthBias);

  if (surfaceValueDiff != 0.0) surfaceValueDiff = 1.0;
	float outline = saturateValue(surfaceValueDiff + depthDiff);
			
  // Combine outline with scene color.
  vec4 outlineColor = vec4(uOutlineColor, 1.0);

  vec4 sceneColor = vec4(0.0, 0.0, 0.0, 1.0);
  gl_FragColor = vec4(mix(sceneColor, outlineColor, outline));
  // gl_FragColor = vec4(vec3(depth), 1.);
  // gl_FragColor = vec4(texture2D(tMap, vUv).xyz, 1.);
}