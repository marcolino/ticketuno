Legenda:
 1: Important task, a showstopper
 2: Deferred task, will fix in a following release
 3: Backlog task, to be possibly implemented in a future version

common:
 1 - OK - translate all to Italian and French and Chinese (use scripts/translate.js)
 1 - OK - enforce a layout to be read-only when the layout is assigned to a theater, and that theater
            is linked to at least one event, and that event has at least one performance where
            at least one seat has been booked or reserved
 1 - OK - change all reason's in database.ts to be uppercase codes, and handle them in frontend,
            to be able to translate reasons and keep backend database code lean
 1 - OK - move all export interface, export type to /shared/types/
 2 - OK - change " into ' (in JS, not in HTML)
 2 - OK - make a cookies popup (even if we only use localstorage for technical goals, and not cookies?)
 2 - OK - unifiy backend/src/utils/misc.ts and frontend/src/utils/misc.ts to shared/utils/misc.ts
 2 - OK - make a /privacy and a /terms page
 3 - OK - use some tool to find unused code and components (ts-prune)
 3 - OK - implement an auditing system - "Audit Implementation Guide" with ChatGPT (done instead with slack)
 3 - OK - ask AI to update README, STRUCTURE, DEPLOY, DOCUMENTATION
 1 - OK - resolve all TypeScript warnings in code
 2 - OK - resolve all TODO's in code
 2 -    - remove all comments in code
 3 -    - implement pushNotifications

 backend:
 1 - OK - add passepartout
 1 - OK - uuidv4 -> uuid-simple
 1 - OK - /backend/uploads -> /data/images
 1 - OK - poster: image-* -> poster-*
 1 - OK - oauth login problem (only in prod)
 1 - OK - check /data is preserved among deploys
 1 - OK - change default admin name, surname
 1 - OK - process.env.* -> config.env.*
 1 - OK - config.env.* -> process.env.*
 1 - OK - introduce "operator" role
 1 - OK - tune token expiration time, and put it in config
 1 - OK - use i18n.t (or something the like) in server.ts (only in requests)
 1 - OK - complete MJML email template system - "MJML Template TicketUno" with chatGPT
 1 - OK - add language field to users table, and check emails arrive in the right language
 1 - OK - verify when we accept consent for marketing emails, and then follow the unsubscribe link,
            we should NOT get "you did already unsubscribe from marketing emails"
 1 - OK - check if google users can access via standard email/password, or if error is handled correctly
 1 - OK - pass explicit language to all services (email, hmac, setup, ticket)
 1 - OK - check why migrations do fail in production (99999_...)
 1 - OK - complete tickets buy process, sending an email to user with the ticket (with a QRCode?)
 1 - OK - when creating a new performance, check if the theater linked to the event of the performance
            has other performances on that date/time (and all guards)
 2 - OK - when logging in with email/pass, if no password in user and a social auth id uis present, return an error code
            "SOCIAL_USER_LOGGING_WITH_EMAIL", and in frontend tell user she did access originally with socail auth, so
            she can try with it, or set up a password, with buttons for social auth and for password reset
 2 - OK - add a bookings component for operators/admins, with a ticket convalidation view (with a QRCode?)
 2 - OK - add a check to avoid deleting currently logged user
 3 - OK - refactor routes in routes+controllers - see Claude chat "Fixing booking confirmation email API..." - NO
 2 - OK - set up a staging machine on fly.io / Dockerfile / fly.toml / package.json
 2 -    - complete tickets buy process, optionally redirecting to stripe for payment
 3 -    - make a script to backup database, and schedule it, daily
 3 -    - make a method to clean up unreferenced images from /data/images, and schedule it, weekly
 3 -    - make a check job to release expired reservations (releaseExpiredReservations), and schedule it, weekly
 3 -    - before using analytics and marketing cookies, always check:
            const { canUseAnalytics, canUseMarketingCookies } = useConsent();
 3 -    - implement a real logging system
 3 -    - implement tests

 frontend:
 1 - OK - Design.tsx => Home.tsx
 1 - OK - avoid flickering with ChatGPT
 1 - OK - check in production that navigate(-1) from custom useNavigate hook (EventEdit, cancel), coming from an external domain, sends to our domain home page, and does not exit to external domain
 1 - OK - always use custom useNavigate hook
 1 - OK - always use @ for ../...
 1 - OK - solve issue of poster not reachable in prod
 1 - OK - 404 image should be responsive on mobile
 1 - OK - event list: poster image should not increase event container squared size
 1 - OK - less vertical space among menu items
 1 - OK - always use showDialog
 1 - OK - language popup menu on desktop should be closer to it's menu entry (no)
 1 - OK - add "CastEditor.tsx compomnent
 1 - OK - move routes from App.tsx to Routes.tsx
 1 - OK - reduce login/... padding in mobile mode
 1 - OK - warning 'pathnames cannot have embedded double slashes - normalizing /event/id/performance//'
 1 - OK - in EventDetails add "bookings" button for admin (operator) too
 1 - OK - dark mode changes logo colors in a less then optimal way
 1 - OK - add version number/build/date in footer
 1 - OK - make theme selectable among "light", "dark" and "system"
 1 - OK - components container + title should be common for all components (perhaps)
 1 - OK - normalize all *List.tsx components as TheatersList, and make same aspect for event with and without poster
 1 - OK - complete ConsentContext translations (?)
 1 - OK - in event details, check for login as soon as one seat is selected, to avoid loosing state
 1 - OK - settings handling - "React MUI PWA Setup" with ChatGPT
 1 - OK - in settings/misc add all currency handling
 1 - OK - use currency from settings, and remove currency selection from EventEdit component
 1 - OK - reduce lineHeight in AuthDialog text "An email will be sent..."
 1 - OK - when no laguage is set yet, set user's browser language
 1 - OK - check google login error (Enrica's phone)
 1 - OK - check iOS google login error "popup blocked"
 1 - OK - on starting, setup must have default values (in GeneralSetup)
 1 - OK - handle uniformly user's permissions in components loading
 1 - OK - in EventEdit, let user create a new theater, as we do in TheaterEdit for Layouts
 1 - OK - test iOS google login error "popup blocked" (on appetize.io)
 1 - OK - in all *List components, ask for confirmation before deleting an asset
 1 - OK - ask Claude (giving it database.ts) why deleting an event an then a theater
            I get SQLITE ERROR REFERENCE KEY ... (?) Is it correct I get that error?
            I always do soft-deletes, so I'd expect an error only when trying to delete
            events with booked performances...
 1 - OK - disable useNavigate custom hook, returning directly react useNavigate
 1 - OK - complete guards handling, like in TheaterList
 1 - OK - remove isLoading in all components from useState, and use isLoading fro useLoading
 1 - OK - in all components, handle errors using import { getErrorMessage } from '@/utils/misc':
            change all error.response?.data?.error to getErrorMessage(error)
 1 - OK - PWA handling - "PWA setup automation for theater booking system" with Claude
 1 - OK - check why when deleting a layout (for example), LayoutList must be reloaded to show it
 2 - OK - in footer print also process.env.GIT_COMMIT_DATE
 2 - OK - use phone component for profile too
 2 - OK - while uploading an image, enable editing it
 2 - OK - check "special seats" reservability: staff and unavaliable are not reservable, and others are reservable
 2 - OK - when adding a row in a layout, move down accordingly following sectors, if any
 2 - OK - add check for changes in all components (when dirty), before navigating away
 2 - OK - add privacy and terms links in the register page
 2 - OK - in profile (or in setup/privacy?) add Terms and Privacy pages, and link to open consent dialog
 2 - OK - implement a mailing system to send bulk emails to a list of users, with variables
 3 - OK - in LayoutEdit, add a 'signle seat' mode, to mark single seats as absent, vip, handicap, baby, unavailable
 3 - OK - rename Profile to UserEdit (no)
 3 - OK - rename Event/Layout/Theater List to Events/Theaters/Layouts List (no...)
 3 - OK - add all users profile handling
 3 - OK - remove .env, .env.example
 3 -    - implement tests

bugs:
 1 - OK - Creating an event, cast roles are not saved
 2 - OK - in ImageUploadEditPopup: if an image is present, allow user to edit current image OR upload a new image
 2 - OK - in EventEdit, Description and all inputs show label over the value... (solved ditching useForm)
 2 - OK - base ticket price, on mobile: cannot use backspace
 2 - OK - correctly implement useBlocker from react-router-dom
 2 - OK - Add ticketuno-staging to google developer console oauth
 3 - OK - add ENVIRONMENT.md to project and implement it
 3 - OK - change: Nessuna rappresentazione disponibile al momento => Nessuno spettacolo...
 3 - OK - the Privacy and Terms in Footer should be translated
 3 - OK - strings commedia, ... should be in i18n static (no...)
 3 -    - staging character is not shown in footer... (DONE, TO BE TESTED)
 3 - OK - "Scansiona il codice QR del biglietto" => "Scansiona il codice QR dei biglietti"
 3 - OK - In not production/staging modes, increase server timeout (until we a re on a free plan)
 3 - OK - "Scansiona il codice QR del biglietto": "Ferma" is not useful, rename as "Stop scanning",
          and link to current closing cross callback, and remove closing cross.
 3 - OK - Convalid reservations: no need for base page, just make a popup.
Events 'canceled' when Edited show all empty fields... See database.ts...
 3 - OK - Terms and privacy text in Footer on mobile are not vertically aligned
 3 - OK - Terms and Privacy are not translated on mobile
 3 - OK - "Impostazioni sono state reimpostate" => "Le imp..."
 3 - OK - Add cross icon to close AuthDialog
 3 - OK - Add tooltips to theme selection buttons
 3 - OK - Force translations to be completed before deploying
 3 - OK - In ImageEditor make the original image and edited image container scrollable
 3 - OK - (i) versione: copy from farmatime version dialog, and add mode (development, staging, production)
 2 -    - Ask AI to implement BookingsList, like UsersList
 3 -    - Setup: Payments / enabled [], gateway: ["Stripe", ...] and look at config if we should move some key to setup...
 3 -    - In EventList, if !setup.payments.enabled, say no price
 3 -    - In EventEdit, remove empty currency from currencies menu; !setup.payments.enabled, disable currency and price

