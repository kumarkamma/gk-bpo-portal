import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function useLenis() {
  const lenisRef = useRef(null)

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) })
    lenisRef.current = lenis

    lenis.on('scroll', ScrollTrigger.update)

    // Store the exact same function reference so the cleanup can remove it
    const rafFn = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(rafFn)
    gsap.ticker.lagSmoothing(0)

    return () => {
      lenis.destroy()
      gsap.ticker.remove(rafFn) // same reference — leak fixed
    }
  }, [])

  return lenisRef
}

export function usePageAnimation(ref) {
  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
    )
  }, [ref])
}

export function useCountAnimation(ref, target, duration = 1.5) {
  useEffect(() => {
    if (!ref.current) return
    const obj = { val: 0 }
    gsap.to(obj, {
      val: target,
      duration,
      ease: 'power2.out',
      onUpdate: () => { ref.current.textContent = Math.round(obj.val).toLocaleString() },
    })
  }, [target, duration, ref])
}

export function useStaggerAnimation(containerRef) {
  useEffect(() => {
    if (!containerRef.current) return
    const items = containerRef.current.querySelectorAll('.stagger-item')
    gsap.fromTo(items,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out' }
    )
  }, [containerRef])
}
