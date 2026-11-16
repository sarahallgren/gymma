# Gymma

En enkel träningsapp för gymmet. Den fungerar i mobilens webbläsare och kan läggas på hemskärmen som en app.

## Vad den gör

- **Dagens pass** enligt veckoschemat visas överst på startsidan:
  - Måndag: axlar och vader
  - Tisdag: rygg och triceps
  - Onsdag: bröst och biceps
  - Torsdag: vila
  - Fredag: ben och mage
- **Rotation på 4 veckor:** 3 övningar per muskelgrupp och pass – en för varje del av muskeln (till exempel främre, sidan och bakre axeln). Övningarna byts varje vecka, och redskapen blandas i varje pass. Fliken **Schema** visar hela rotationen.
- **Ändra schemat i appen:** Under **Schema** trycker du **Ändra** och sedan **Byt** vid en övning. Du väljer bland övningarna för samma muskelgrupp. Det går att återställa en plats eller hela schemat.
- **Logga bara sista setet:** Målet är 4 set × 12 reps. En övning i taget är öppen. Du ställer in vikt och reps med plus och minus och trycker **Klar**. Klara övningar krymper till en rad.
- **Set-räknare och vila:** Tryck **Set klart** efter varje set. Prickarna visar hur många set du har gjort, och vilan räknas ner i en rad ovanför menyn. Du kan lägga till 30 sekunder eller hoppa över vilan. För övningar i sekunder (till exempel plankan) startar knappen en nedräkning av själva setet. Mobilen vibrerar när tiden är slut, om den stöder det. Tiden räknas bara medan appen är öppen.
- **Byt övning i passet:** Är maskinen upptagen trycker du **Byt övning** och får förslag för samma del av muskeln. Bytet gäller bara dagens pass.
- **Anteckning per övning:** Till exempel sitshöjd eller grepp. Anteckningen visas varje gång övningen är med.
- **Förslag på högre vikt:** Klarade du alla reps förra gången föreslår appen nästa vikt.
- **Veckorad** på startsidan som visar vilka dagar du har tränat.
- **Bilder** som visar start- och slutläge för varje övning.
- **Historik** per månad. Varje pass går att fälla ut och visar om du har ökat sedan förra gången.
- **Framsteg** under Historik: antal pass, ökningar, veckor då du gjort alla pass, nya rekord och ökningar per muskelgrupp. Välj 4 veckor, 3 månader eller allt.
- **Övningar** med sök och filter på muskelgrupp och redskap (maskin, kabel, hantlar, stång eller kroppsvikt). Redskapet visas som en liten etikett på varje övning. Varje övning visar senaste resultat, bästa vikt, plats i schemat och en kurva över utvecklingen. Du kan lägga till egna övningar.
- **Inställningar** (kugghjulet uppe till höger):
  - **Färgteman:** Grön, rosa, blå, grå och sand. Ljust eller mörkt läge följer mobilens inställning.
  - **Steg för plus och minus:** Välj hur mycket vikten ändras för maskin, kabel, hantlar och stång, så att det stämmer med vikterna på ditt gym. Automatiskt betyder 1 kg upp till 10 kg, sedan 2,5 kg.
  - **Vila mellan set:** Välj hur lång vilan är, eller **Räkna inte set** om du inte vill ha set-räknaren. Du kan också slå på ett ljud när vilan är slut.
- **Säkerhetskopia** som du kan spara som fil och läsa in igen.

## Var sparas mina pass?

Bara i webbläsaren på din mobil (localStorage). Inget skickas till någon server.
Det gäller också dina anteckningar, egna övningar, byten i schemat och inställningarna.
Allt försvinner om du rensar webbläsarens data eller byter mobil, så spara en kopia ibland under **Historik → Spara kopia**. Kopian innehåller allt.

## Publicera appen gratis med GitHub Pages

1. Gå till repot på GitHub → **Settings** → **Pages**.
2. Under **Build and deployment**, välj **Deploy from a branch**.
3. Välj grenen **main** och mappen **/ (root)**. Klicka **Save**.
4. Efter en minut finns appen på `https://sarahallgren.github.io/gymma/`.

## Lägg appen på hemskärmen

- **iPhone (Safari):** Dela-knappen → **Lägg till på hemskärmen**.
- **Android (Chrome):** Menyn ⋮ → **Lägg till på startskärmen**.

## Filerna

| Fil | Vad den innehåller |
|---|---|
| `index.html` | Sidans grundstruktur |
| `style.css` | Utseende: färgteman (överst i filen), knappar, mörkt läge |
| `exercises.js` | Övningar, veckoschema, rotationen (`ROTATION`, en rad per vecka) och antal set/reps – enklast att ändra här |
| `bilder/` | Två bilder per övning (start och slut) |
| `app.js` | All logik: pass, set, vila, historik, framsteg, inställningar, sparande |
| `manifest.webmanifest`, `icon*` | Gör att den kan installeras som app |

## Bilderna

Övningsbilderna kommer från [Free Exercise DB](https://github.com/yuhonas/free-exercise-db), som är fri att använda (public domain, Unlicense). De är förminskade för att ladda snabbt i mobilen.
