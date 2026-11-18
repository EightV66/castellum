// Integrate an exponential height profile along the eye-to-surface ray.
// Valley inversion and a thinner high-altitude aerosol layer.
const haze = `
  float topHeight=max(cameraPosition.y,0.)/26.;
  float endHeight=max(fjordHeight,0.)/26.;
  float delta=endHeight-topHeight;
  float density=abs(delta)<.006?exp(-.5*(topHeight+endHeight)):(exp(-topHeight)-exp(-endHeight))/delta;
  float mist=1.-exp(-density*vFogDepth*fogDensity*4.6);
  float highAir=exp(-max((min(cameraPosition.y,fjordHeight)-35.)/145.,0.));
  float optical=vFogDepth*fogDensity*mix(.36,.81,highAir)*alpineAerosol;
  float haze=clamp(1.-exp(-optical*optical-mist),0.,.96);
  gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor*vec3(1.12,1.27,1.39),haze);
`;

export function addValleyMist(scene) {
  const done = new Set();
  scene.traverse((obj) => {
    const mat = obj.material;
    if (!mat?.isMeshStandardMaterial || done.has(mat)) return;
    done.add(mat);
    const before = mat.onBeforeCompile.bind(mat),
      key = mat.customProgramCacheKey();
    mat.customProgramCacheKey = () => key + "-valley";
    mat.onBeforeCompile = (shader, renderer) => {
      before(shader, renderer);
      shader.vertexShader =
        "varying float fjordHeight;\n" +
        shader.vertexShader.replace(
          "#include <project_vertex>",
          `#include <project_vertex>
        vec4 fjordPoint=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          fjordPoint=instanceMatrix*fjordPoint;
        #endif
        fjordHeight=(modelMatrix*fjordPoint).y;`,
        );
      shader.uniforms.alpineAerosol = {
        value: mat.userData.highAltitudeHaze ?? 1,
      };
      shader.fragmentShader =
        "varying float fjordHeight;uniform float alpineAerosol;\n" +
        shader.fragmentShader.replace(
          "#include <fog_fragment>",
          "#ifdef FOG_EXP2\n" +
            haze +
            "\n#else\n#include <fog_fragment>\n#endif",
        );
    };
  });
}
