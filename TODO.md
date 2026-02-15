common:
 - change " into ', wherever possible - OK

 - translate all to Italian and French
 - make a /privacy and a /terms page


 backend:
 - add passepartout - OK
 - uuidv4 -> uuid-simple ... - OK

 - /backend/uploads -> /data/images - OK
 - poster: image-* -> poster-* - OK
 - oauth login problem (only in prod) - OK
 - check /data is preserved among deploys - OK
 
 - change default admin name, surname, ...
 - introduce "operator" role
 - make a method to clean up unreferenced images from /data/images
 - schedule job to call the method to clean up unreferenced images
 - set up a staging machine on fly.io / Dockerfile / fly.toml / package.json
 - process.env. -> config.env.
 - tune token expiration time

 frontend:
 - Design.tsx => Home.tsx - OK
 - avoid flickering with ChatGPT - OK
 - check in production that navigate(-1) from custom useNavigate hook (EventEdit, cancel), coming from an external domain, sends to our domain home page, and does not exit to external domain - OK
 - always use custom useNavigate hook - OK
 - always use @ for ../... - OK
 - solve issue of poster not reachable in prod - OK
 - 404 image should be responsive on mobile - OK
 - event list: poster image should not increase event container squared size - OK
 - less vertical space among menu items - OK

 - handle users profiles (by admin)
 - move routes from App.tsx to Routes.tsx
 - always use showDialog
 - reduce login/... padding in mobile mode
 - language popup menu on desktop should be closer to it's menu entry
 - components container + title should be common for all components
 - in EventDetails correct "book" button and add for admin (operator) too
 - dark mode changes logo colors in a less then optimal way
 - use currency from setup, and remove currency selection from EventEdit component
 - resolve all TODO's in code
 - resolve all TS warnings in code
 - add version number/build/date in footer
 - normalize all *List.tsx components as TheatersList, and make same aspect for event with and without poster
 - settings handling - "React MUI PWA Setup" with ChatGPT
 - make theme selectable among "light", "dark" and "system"
 - PWA handling - "PWA setup automation for theater booking system" with Claude
