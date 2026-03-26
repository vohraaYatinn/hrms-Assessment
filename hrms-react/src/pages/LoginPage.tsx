import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const brandBlue = '#2b418c'
const brandGold = '#e8c547'

const DEMO_EMAIL = 'admin@login.com'
const DEMO_PASSWORD = '1234'

const SLIDE_IMAGES = [
  '/assets/login/side-image.png',
  '/assets/login/side-image-2.jpg',
  '/assets/login/side-image-3.webp',
] as const

const SLIDE_INTERVAL_MS = 5500
const AUTH_STORAGE_KEY = 'hrmsLoggedIn'

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(4, 'Password must be at least 4 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const [remember, setRemember] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })

  useEffect(() => {
    const isLoggedIn = localStorage.getItem(AUTH_STORAGE_KEY) === 'true'
    if (isLoggedIn) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveSlide((s) => (s + 1) % SLIDE_IMAGES.length)
    }, SLIDE_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [])

  function onValid(_data: LoginFormValues) {
    localStorage.setItem(AUTH_STORAGE_KEY, 'true')
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="flex min-h-[100svh] w-full flex-col bg-white lg:grid lg:min-h-dvh lg:grid-cols-2 lg:bg-transparent">
      {/* Form first in DOM: primary on mobile (top), left column on lg */}
      <div className="flex flex-col justify-start px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-8 sm:px-8 sm:pb-10 sm:pt-8 lg:flex-1 lg:justify-center lg:px-16 lg:pb-12 lg:pt-12 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <h1
            className="text-3xl font-bold tracking-tight sm:text-[2.5rem]"
            style={{ color: brandBlue }}
          >
            Login
          </h1>
          <p className="mt-1.5 text-sm text-neutral-500 sm:mt-2 sm:text-base">
            Login to your account.
          </p>

          <Form {...form}>
            <form
              className="mt-8 space-y-5 sm:mt-10 sm:space-y-6"
              onSubmit={form.handleSubmit(onValid)}
              noValidate
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <FormItem className="gap-2">
                    <FormLabel
                      className="text-xs font-bold data-[error=true]:text-destructive"
                      style={
                        fieldState.error
                          ? undefined
                          : { color: brandBlue }
                      }
                    >
                      E-mail Address
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        className="h-11 rounded-lg border-neutral-300 bg-white shadow-none focus-visible:ring-[#2b418c]/30"
                        style={{ borderColor: '#d4d4d8' }}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
                  <FormItem className="gap-2">
                    <FormLabel
                      className="text-xs font-bold data-[error=true]:text-destructive"
                      style={
                        fieldState.error
                          ? undefined
                          : { color: brandBlue }
                      }
                    >
                      Password
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        className="h-11 rounded-lg border-neutral-300 bg-white shadow-none focus-visible:ring-[#2b418c]/30"
                        style={{ borderColor: '#d4d4d8' }}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 py-1">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                  className={cn(
                    'size-[1.125rem] shrink-0 rounded border-neutral-300 sm:size-4',
                    'data-[state=checked]:border-[#2b418c] data-[state=checked]:bg-[#2b418c]',
                  )}
                />
                <span className="text-sm text-neutral-500">Remember me</span>
              </label>
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-lg text-base font-semibold text-white shadow-none hover:opacity-95"
              style={{ backgroundColor: brandBlue }}
            >
              Sign In
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-neutral-300 text-xs font-medium shadow-none hover:bg-neutral-50"
              style={{ color: brandBlue }}
              onClick={() => {
                form.setValue('email', DEMO_EMAIL, {
                  shouldValidate: true,
                  shouldTouch: true,
                })
                form.setValue('password', DEMO_PASSWORD, {
                  shouldValidate: true,
                  shouldTouch: true,
                })
              }}
            >
              Use demo credentials
            </Button>
            </form>
          </Form>

          <p className="mt-5 text-center text-[0.7rem] leading-relaxed text-neutral-500 sm:mt-4 sm:text-xs">
            This is just a demo page for UI purposes — you can use any email or
            password here.
          </p>
        </div>
      </div>

      <aside className="relative isolate h-[min(220px,28svh)] w-full shrink-0 sm:h-[min(260px,32svh)] md:h-[min(300px,36svh)] lg:h-auto lg:min-h-dvh">
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          {SLIDE_IMAGES.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              className={cn(
                'absolute inset-0 size-full object-cover transition-opacity duration-[900ms] ease-in-out',
                i === activeSlide ? 'opacity-100' : 'opacity-0',
              )}
            />
          ))}
        </div>
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: brandBlue,
            opacity: 0.72,
            mixBlendMode: 'multiply',
          }}
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#1a2758]/90 via-[#2b418c]/40 to-transparent"
          aria-hidden
        />

        <div className="relative flex h-full min-h-0 flex-col justify-end px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10 sm:px-8 sm:pb-8 sm:pt-12 lg:min-h-dvh lg:px-16 lg:pb-14 lg:pt-16">
          <p className="max-w-lg text-lg font-bold leading-snug tracking-tight text-white sm:text-xl sm:leading-tight md:text-2xl lg:text-[2.35rem] lg:leading-[1.2]">
            Manage all{' '}
            <span style={{ color: brandGold }}>HR Operations</span> from the
            comfort of your home.
          </p>

          <div
            className="mt-4 flex justify-center gap-1 sm:mt-6 sm:gap-2 lg:mt-12 lg:justify-start"
            role="tablist"
            aria-label="Login hero slides"
          >
            {SLIDE_IMAGES.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === activeSlide}
                aria-label={`Slide ${i + 1} of ${SLIDE_IMAGES.length}`}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                onClick={() => setActiveSlide(i)}
              >
                <span
                  className="block h-1.5 w-9 rounded-full sm:w-10"
                  style={{
                    backgroundColor:
                      i === activeSlide ? brandGold : 'rgba(255,255,255,0.45)',
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
