# Design Deliverables Change Log

What changed in the HOL design deliverables, day by day.

How to write an entry (the 8 PM job writes one automatically each weekday):

- One `## DD-Mon-YYYY` section per day, newest last.
- `- Added: Portal / Feature / Sub feature` when a page is delivered.
- `- Removed: Portal / Feature / Sub feature` when a page is dropped.
- Any other `- ` line is a note on the day's work.

Portal is one of: Global Pages, Super Admin Portal, Provider Portal, Patient Portal.

## 22-Sep-2026

- Component library baseline
- Human Optimization brand: favicon, logo and storage keys
- Added: Global Pages / Design System / Design system

## 23-Sep-2026

- EHR patients screen, brand refresh, logo and colour review pages
- First visit lands on the light theme
- Adopted the Variation 5 logo and teal as the default accent
- Added: Provider Portal / Patients / Patient worklist
- Added: Provider Portal / Patients / Register patient

## 24-Sep-2026

- Built the login flow: sign in, two-factor setup and verification, password reset, account activation
- Designed the invitation email for desktop and mobile
- Built the error states: page not found, permission denied, offline, session expired
- Added the session timeout warning and the logo loader
- Built the Super Admin Practices module: practice list and practice details
- Practice setup now captures group NPI and a primary contact; addresses dropped from the form
- Set up the Design Deliverables sheet
- Auth, error states, Super Admin practices and design deliverables register
- Capture legal name, NPI, primary contact, programs and plan limits on practice setup
- Serve the invite and first sign-in to clinic managers as well as the Super Admin
- Drop legal name, addresses, programs and plan limits from practice setup
- Drop title from the practice primary contact
- Drop the default location option from practice setup
- Remove practice delete; deactivate is the only way to take a practice offline
- React Native patient app with invite, activation and set password
- Ship the app's fonts so the /app web build renders
- Match the portal's design system and show the app in a phone frame on wide screens
- Cyan DME Clinical EHR demo gallery at /dme
- Layout options and primary colour customization in the DME demo gallery
- Use the gallery's theme customizer in the DME demo, add plum
- Rebrand demo as Lakeside Sleep Center, deepen plum
- Clinic manager and provider portals, onboarding flows, bulk import
- Rebuild patient app web bundle
- Refine patient records, locations and users; mobile UI polish
- Patient duplicate review, record refinements; rebuild mobile bundle
- Added: Global Pages / Authentication / Sign in
- Added: Global Pages / Authentication / Two-factor verification
- Added: Global Pages / Authentication / Two-factor setup
- Added: Global Pages / Authentication / Forgot password
- Added: Global Pages / Authentication / Reset code sent
- Added: Global Pages / Authentication / Reset password
- Added: Global Pages / Authentication / Set password
- Added: Global Pages / Authentication / Activate account
- Added: Global Pages / Authentication / Invitation email (desktop)
- Added: Global Pages / Authentication / Invitation email (mobile)
- Added: Global Pages / Session / Session expired
- Added: Global Pages / Error States / All error states
- Added: Global Pages / Error States / Permission denied
- Added: Global Pages / Error States / No internet connection
- Added: Global Pages / Error States / Page not found
- Added: Super Admin Portal / Practices / Practice list
- Added: Super Admin Portal / Practices / Practice details
- Added: Global Pages / Dme / Foundations
- Added: Global Pages / Dme / Icons
- Added: Global Pages / Dme / Layouts
- Added: Global Pages / Dme / Dme
- Added: Global Pages / Dme Screens / Side Nav
- Added: Global Pages / Dme Screens / Top Nav
- Added: Provider Portal / Clinic Manager Portal / Edit location
- Added: Provider Portal / Clinic Manager Portal / Location details
- Added: Provider Portal / Clinic Manager Portal / Add location
- Added: Provider Portal / Clinic Manager Portal / Locations (list)
- Added: Provider Portal / Clinic Manager Portal / Edit patient
- Added: Provider Portal / Clinic Manager Portal / Patient profile
- Added: Provider Portal / Clinic Manager Portal / Review possible duplicate
- Added: Provider Portal / Clinic Manager Portal / Possible duplicates queue
- Added: Provider Portal / Clinic Manager Portal / Patient onboarding form
- Added: Provider Portal / Clinic Manager Portal / Patients (list, bulk import)
- Added: Provider Portal / Clinic Manager Portal / Users: providers tab (list, bulk import)
- Added: Provider Portal / Clinic Manager Portal / Edit provider
- Added: Provider Portal / Clinic Manager Portal / Provider profile
- Added: Provider Portal / Clinic Manager Portal / Add provider
- Added: Provider Portal / Provider Portal / Edit patient
- Added: Provider Portal / Provider Portal / Patient profile
- Added: Provider Portal / Provider Portal / Add patient and send invite
- Added: Provider Portal / Provider Portal / Patients (list, bulk import, send invites)
- Added: Provider Portal / Clinic Manager Onboarding / Invitation email (desktop)
- Added: Provider Portal / Clinic Manager Onboarding / Invitation email (mobile)
- Added: Provider Portal / Clinic Manager Onboarding / Activate account
- Added: Provider Portal / Clinic Manager Onboarding / Set password
- Added: Provider Portal / Clinic Manager Onboarding / Two-factor setup
- Added: Provider Portal / Clinic Manager Portal / Users: non-clinical users tab (list, add, view, edit panels)
- Added: Provider Portal / Provider Onboarding / Invitation email (desktop)
- Added: Provider Portal / Provider Onboarding / Invitation email (mobile)
- Added: Provider Portal / Provider Onboarding / Activate account
- Added: Provider Portal / Provider Onboarding / Set password
- Added: Provider Portal / Provider Onboarding / Two-factor setup
- Added: Patient Portal / Patient Onboarding / Invitation email (desktop)
- Added: Patient Portal / Patient Onboarding / Invitation email (mobile)
- Added: Patient Portal / Patient Onboarding / Activate account (mobile app)
- Added: Patient Portal / Patient Onboarding / Sign in (mobile app)
