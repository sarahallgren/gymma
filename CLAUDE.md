# Instruktioner för Claude i det här repot

- Gymma är en personlig träningsapp. Ägare: Sara. Hon lär sig bygga appar med Claude, så förklara kort och på enkel svenska vad du ändrar och varför.
- Allt i appen ska vara på svenska.
- Ren HTML, CSS och JavaScript. Inget byggsteg, inga ramverk, inga externa beroenden eller CDN:er. Appen ska fungera direkt på GitHub Pages.
- Data sparas bara i localStorage under nyckeln `gymma-v1`. Ändra aldrig formatet så att gammal historik går förlorad – lägg till fält i stället.
- Sara loggar bara sista setet per övning (vikt + reps). Mål: 4 set × 12 reps.
- Träningen följer ett veckoschema och en treveckorsrotation med 3 övningar per muskelgrupp – en per del av muskeln. Se `SCHEDULE` och `ROTATION` i `exercises.js`.
- Övningarnas `id` i `exercises.js` får inte ändras, eftersom historiken pekar på dem.
- Mobilen först: tryckytor minst 44 px, fungerar med skärmläsare och tangentbord, stöd för mörkt läge.
- Arbeta i en egen gren och öppna en pull request, så att Sara kan granska innan något hamnar på main.
- Färgteman: fem lugna teman (gron, rosa, bla, gra, sand) som CSS-variabler överst i `style.css`, i ljus och mörk variant. Valet sparas i `settings.theme`. Nya färger ska klara WCAG AA (4,5:1 för text).
- Passvyn visar en öppen övning i taget. Vilken som är öppen är bara skärmläge och sparas inte.
- Testa i en webbläsare med mobilbredd (320–390 px) innan du öppnar en pull request: hela passflödet, gamla sparade data och båda färglägena.
