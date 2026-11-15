# CampusConnect — Final delivery change log

## Implemented in this ZIP
1. Replaced the previous light/blue homepage styling with the approved dark Phthalo Green visual direction.
2. Added the exact NIE campus building image provided by the user as the homepage hero background.
3. Reworked the CampusConnect brand header, logo mark, navigation and admin link.
4. Added the large campus hero headline, supporting copy and Explore Events / About actions.
5. Added the Events, Clubs, Competitions and Community feature rail.
6. Reworked upcoming event cards with category, fee, date, time, venue, seat count and registration link.
7. Restyled search, category and fee filters.
8. Added an about/brand strip and updated footer.
9. Added responsive layout rules for smaller screens.
10. Updated page title, description and browser theme colour.
11. Changed the registration poster presentation to show the complete image without cropping.
12. Preserved the existing React routes, API integration, PostgreSQL data model, admin event workflow and Docker Compose setup.

## Not included / still pending
- Authentication and authorization (admin routes are not secured).
- QR code ticket creation, email delivery and QR scanner attendance.
- Student account / My Registered Events page.
- Advanced analytics and branch-wise reports.
- Payment integration.
- Auditorium gallery section (awaiting the real auditorium photo).
- End-to-end runtime testing against a running Docker/PostgreSQL environment.

## Validation notes
This package was updated from the user's supplied source ZIP. A live database-backed test was not run in this environment. Start the app with `docker compose up --build` and verify the API/database on the user's machine before presenting it as production-ready.

13. Added secure random QR ticket token generation; only SHA-256 token hashes are stored in PostgreSQL.
14. Added QR image generation on successful registration and a downloadable QR ticket.
15. Added optional SMTP email delivery for the ticket (requires verified SMTP credentials in environment variables).
16. Added the My Registered Events lookup page by registration email.
17. Added organizer camera scanner using `html5-qrcode`, plus manual payload fallback.
18. Added event-scoped ticket verification and duplicate check-in prevention.
19. Added attendance counts/status data to registration API responses and Admin registration list.
20. Added SMTP environment template and setup documentation.

## Security limitation to resolve before public deployment
Admin and organizer routes/pages still do not have authentication/role-based access control. Keep this project on localhost or a trusted private network until that layer is implemented and tested. SMTP delivery also requires the user to configure a verified sender and credentials.

## SMTP environment variables
The backend reads `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `SMTP_FROM` from the container environment. A template is included at `backend/.env.example`; copy the values into a root `.env` beside `docker-compose.yml`. The sender address must be verified by your SMTP provider. Without these settings, email delivery is skipped and the on-screen/downloadable QR remains available.

## Local verification checklist
1. Run `docker compose up --build`.
2. Create an event in Admin.
3. Register with a test email and download the QR from the confirmation screen.
4. Open `/scanner` on the organizer device, choose that same event, allow camera permission and scan the QR.
5. Scan the same QR again; it should report that the ticket was already checked in.
6. Try the same QR with another event selected; it should be rejected.
7. Configure SMTP and repeat registration to verify actual email delivery.

21. Fixed Docker dependency-volume mismatch: frontend/backend services now run `npm install` before starting, so existing anonymous `/app/node_modules` volumes receive newly added packages such as `html5-qrcode`, `qrcode`, and `nodemailer`.
