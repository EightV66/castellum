// Both the cliff mesh and the waterfall lips sample this periodic coastline.
export function cliffRadius(angle, fraction, seed) {
  const a=angle, f=fraction;
  const shoreline=1+Math.sin(a*7+seed)*.065+Math.sin(a*17+seed)*.04+Math.sin(a*31)*.02;
  const joint=Math.sin(a*9+seed+f*1.9)+.63*Math.sin(a*14-f*3.6+seed);
  const ledge=Math.max(0,1-Math.abs(f-.50-.16*Math.sin(a*3+seed))*14);
  const split=Math.max(0,1-Math.abs(joint)*3);
  const erosion=.043*ledge-.058*split+.023*Math.sin(a*28+seed+f*5.4)+.014*Math.sin(f*28*.57+a*3);
  return (1.23-.23*f)*(shoreline+erosion*Math.min(1,(1-f)*28));
}
