declare module 'gsap/all' {
  import gsap from 'gsap';
  const gsapNamed: typeof gsap;
  export { gsapNamed as gsap };
  export const Draggable: any;
  export default gsap;
}
