# Smart Visa Form Generator

The generator now creates a clean application-form page directly from saved application data instead of stamping values onto the old Japan model pages.

- Applicant photo is placed in a fixed photo box with aspect-ratio-preserving cover crop.
- Personal, passport, contact and visa fields use dedicated rows so values cannot drift into the wrong line.
- Missing fields remain blank/dash; the generator never guesses data.
- Old rendered Japan model pages and template PDFs were removed from the project.
