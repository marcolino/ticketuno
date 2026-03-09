Legenda:
 1: Important task, a showstopper
 2: Deferred task, will fix in a folloging release
 3: Backlog task, to be possibly implemmented in a future version

common:
 - 2 - change " into ' (in JS, not in HTML) - OK
 - 2 - make a cookies popup (even if we only use localstorage for technical goals, and not cookies?) - OK

 - 1 - translate all to Italian and French
 - 1 - remove all comments in code
 - 1 - resolve all TODO's in code
 - 1 - resolve all TypeScript warnings in code
 - 2 - make a /privacy and a /terms page
 - 2 - use some tool to find unused code and components
 - 2 - implement an auditing system - "Audit Implementation Guide" with ChatGPT

 backend:
 - 1 - add passepartout - OK
 - 1 - uuidv4 -> uuid-simple - OK
 - 1 - /backend/uploads -> /data/images - OK
 - 1 - poster: image-* -> poster-* - OK
 - 1 - oauth login problem (only in prod) - OK
 - 1 - check /data is preserved among deploys - OK
 - 1 - change default admin name, surname - OK
 - 1 - process.env.* -> config.env.* - OK
 - 1 - config.env.* -> process.env.* - OK
 - 1 - introduce "operator" role - OK
 - 1 - tune token expiration time, and put it in config - OK
 - 1 - use i18n.t (or something the like) in server.ts (only in requests) - OK
 - 1 - complete MJML email template system - "MJML Template TicketUno" with chatGPT - OK
 - 1 - add language field to users table, and check emails arrive in the right language - OK
 - 1 - verify when we accept consent for marketing emails, and then follow the unsubscribe link, we should NOT get "you did already unsubscribe from marketing emails" - OK
 - 1 - check if google users can access via standard email/password, or if error is handled correctly - OK

 - 1 - complete tickets buy process, optionally redirecting to stripe for payment
 - 1 - complete tickets buy process, sending an email to user with the ticket (with a QRCode?)
 - 2 - when logging in with email/pass, if no password in user and a social auth id uis present, return an error code
         "SOCIAL_USER_LOGGING_WITH_EMAIL", and in frontend tell user she did access originally with socail auth, so
         she can try with it, or set up a password, with buttons for social auth and for password reset
 - 2 - add a bookings component for operators/admins, with a ticket convalidation view (with a QRCode?)
 - 2 - set up a staging machine on fly.io / Dockerfile / fly.toml / package.json
 - 2 - make a script to backup database
 - 3 - make a method to clean up unreferenced images from /data/images
 - 3 - schedule job to call the method to clean up unreferenced images
 - 3 - schedule job to backup database daily, in production
 - 3 - before using analytics and marketing cookies, always check:
         const { canUseAnalytics, canUseMarketingCookies } = useConsent();
 - 3 - implement a real logging system

 frontend:
 - 1 - Design.tsx => Home.tsx - OK
 - 1 - avoid flickering with ChatGPT - OK
 - 1 - check in production that navigate(-1) from custom useNavigate hook (EventEdit, cancel), coming from an external domain, sends to our domain home page, and does not exit to external domain - OK
 - 1 - always use custom useNavigate hook - OK
 - 1 - always use @ for ../... - OK
 - 1 - solve issue of poster not reachable in prod - OK
 - 1 - 404 image should be responsive on mobile - OK
 - 1 - event list: poster image should not increase event container squared size - OK
 - 1 - less vertical space among menu items - OK
 - 1 - always use showDialog - OK
 - 1 - language popup menu on desktop should be closer to it's menu entry (no) - OK
 - 1 - add "CastEditor.tsx compomnent - OK
 - 1 - move routes from App.tsx to Routes.tsx - OK
 - 1 - reduce login/... padding in mobile mode - OK
 - 1 - warning 'pathnames cannot have embedded double slashes - normalizing /event/id/performance//' - OK
 - 1 - in EventDetails add "bookings" button for admin (operator) too - OK
 - 1 - dark mode changes logo colors in a less then optimal way - OK
 - 1 - add version number/build/date in footer - OK
 - 1 - make theme selectable among "light", "dark" and "system" - OK
 - 1 - components container + title should be common for all components (perhaps) - OK
 - 1 - normalize all *List.tsx components as TheatersList, and make same aspect for event with and without poster - OK
 - 1 - complete ConsentContext translations (?) - OK
 - 1 - in event details, check for login as soon as one seat is selected, to avoid loosing state - OK
 - 1 - settings handling - "React MUI PWA Setup" with ChatGPT - OK
 - 1 - in settings/misc add all currency handling - OK
 - 1 - use currency from settings, and remove currency selection from EventEdit component - OK
 - 1 - reduce lineHeight in AuthDialog text "An email will be sent..." - OK
 - 1 - when no laguage is set yet, set user's browser language - Ok
 - 1 - check google login error (Enrica's phone) - OK
 - 1 - check iOS google login error "popup blocked" - OK
 - 1 - on starting, setup must have default values (in GeneralSetup) - OK
 - 1 - handle uniformly user's permissions in components loading - OK

 - 1 - in EventEdit, let user create a new theater, as we do in TheaterEdit for Layouts
 - 1 - in all components, check for setError: always add toast.error, and possibly remove Alert's for errors
 - 1 - in all components, always use getErrorMessage() (import { getErrorMessage } from '@/utils/misc';)
 - 1 - PWA handling - "PWA setup automation for theater booking system" with Claude
 - 1 - test iOS google login error "popup blocked" (on appetize.io)
 - 2 - in footer print also process.env.GIT_COMMIT_DATE
 - 2 - add check for changes in all components (when dirty), before navigating away
 - 2 - add privacy and terms links in the register page
 - 2 - in setup/privacy add Terms and Privacy pages, and link to open consent dialog
 - 3 - find if and where to suggest user to open consent dialog to enable missing consent (for pushNotifications for example)
 - 3 - add all users profile handling (in settings/admin)
