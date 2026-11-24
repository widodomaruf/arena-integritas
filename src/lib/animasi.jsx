import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import Lenis from 'lenis'

export const kurangiGerak = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Elemen ber-atribut data-masuk di dalam ref muncul bergiliran (GSAP). */
export function useMasuk(ref, deps = []) {
  useLayoutEffect(() => {
    if (kurangiGerak() || !ref.current) return
    const ctx = gsap.context(() => {
      const el = gsap.utils.toArray('[data-masuk]')
      if (el.length) gsap.from(el, { opacity: 0, y: 24, duration: 0.6, ease: 'power3.out', stagger: 0.08, clearProps: 'opacity,transform' })
    }, ref)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/** Maskot melayang pelan (GSAP). */
export function useMengambang(ref, jarak = 8) {
  useEffect(() => {
    if (kurangiGerak() || !ref.current) return
    const t = gsap.to(ref.current, { y: -jarak, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 })
    return () => t.kill()
  }, [ref, jarak])
}

/** Scroll halus Lenis, hanya untuk halaman non-permainan. */
export function useLenis(aktif, kunci) {
  useEffect(() => {
    if (!aktif || kurangiGerak()) return
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 })
    const tick = (t) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    lenis.scrollTo(0, { immediate: true })
    return () => { gsap.ticker.remove(tick); lenis.destroy() }
  }, [aktif, kunci])
}

/** Angka naik dari 0 ke nilai (GSAP). */
export function AngkaNaik({ nilai, durasi = 0.9, ...props }) {
  const ref = useRef(null)
  const n = Number(nilai) || 0
  const fmt = (v) => Math.round(v).toLocaleString('id-ID')
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (kurangiGerak()) { el.textContent = fmt(n); return }
    const o = { v: 0 }
    const t = gsap.to(o, { v: n, duration: durasi, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(o.v) } })
    return () => t.kill()
  }, [n, durasi])
  return <span ref={ref} {...props}>{fmt(n)}</span>
}
