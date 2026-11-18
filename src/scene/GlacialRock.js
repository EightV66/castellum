// Project stone in three directions so steep, overhanging faces retain the
// same grain scale as the snowfield. The two sampling scales break repetition.
export function glacialRock(material, map, scale) {
  const former = material.onBeforeCompile.bind(material),
    key = material.customProgramCacheKey();
  material.customProgramCacheKey = () => key + "-alpine-" + scale;
  material.onBeforeCompile = (shader, renderer) => {
    former(shader, renderer);
    shader.uniforms.slateAtlas = { value: map };
    shader.uniforms.slateScale = { value: scale };
    const vary = "varying vec3 vSlateP; varying vec3 vSlateN;\n";
    shader.vertexShader =
      vary +
      shader.vertexShader.replace(
        "#include <project_vertex>",
        `
      vSlateP=(modelMatrix*vec4(transformed,1.)).xyz;vSlateN=normalize(mat3(modelMatrix)*objectNormal);
      #include <project_vertex>`,
      );
    shader.fragmentShader =
      vary +
      "uniform sampler2D slateAtlas; uniform float slateScale;\n" +
      shader.fragmentShader
        .replace(
          "#include <roughnessmap_fragment>",
          `
        vec3 pSlate=vSlateP*slateScale, nSlate=normalize(vSlateN);
        pSlate+=.22*sin(vSlateP.yzx*.032)+.15*sin(vSlateP.zxy*.017);
        vec3 weights=pow(abs(nSlate),vec3(4.)); weights/=max(.001,dot(weights,vec3(1.)));
        vec3 grain=texture2D(slateAtlas,pSlate.zy).rgb*weights.x+
          texture2D(slateAtlas,pSlate.xz).rgb*weights.y+texture2D(slateAtlas,pSlate.xy).rgb*weights.z;
        float drift=texture2D(slateAtlas,pSlate.xz*.31+pSlate.y*.13).g;
        float up=nSlate.y+.15*nSlate.x+.14*nSlate.z;
        float snow=smoothstep(.43,.86,up+.54*drift-.19);
        vec3 sheet=mix(vec3(.30,.46,.59),vec3(.75,.86,.94),clamp(drift*3.+grain.g*.7,0.,1.));
        float banks=texture2D(slateAtlas,pSlate.zy*.16+pSlate.x*.05).g;
        vec3 stone=(grain*vec3(.86,1.09,1.23)+vec3(.008,.014,.023))*(.55+2.4*sqrt(banks));
        diffuseColor.rgb=mix(stone,sheet,snow*.95);
        #include <roughnessmap_fragment>`,
        )
        .replace(
          "#include <normal_fragment_maps>",
          `
        #include <normal_fragment_maps>
        vec3 dx=normalize(dFdx(-vViewPosition)),dy=normalize(dFdy(-vViewPosition));
        vec3 axisX=cross(dy,normal),axisY=cross(normal,dx);
        float det=dot(dx,axisX);
        float ridgeHeight=grain.g*(1.-snow*.92);
        vec3 detailGradient=sign(det)*(dFdx(ridgeHeight)*axisX+dFdy(ridgeHeight)*axisY);
        normal=normalize(abs(det)*normal-1.7*detailGradient+normal*.0001);`,
        );
  };
}
