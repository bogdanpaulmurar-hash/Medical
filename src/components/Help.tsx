import { useState } from 'react';
import { useApp } from '../state';
import type { Lang } from '../i18n';

/** Pagina de instrucțiuni, disponibilă în română și engleză. */
export function Help() {
  const { prefs } = useApp();
  const [lang, setLang] = useState<Lang>(prefs.lang);
  return (
    <section className="help">
      <div className="lang-switch">
        <button className={lang === 'ro' ? 'chip on' : 'chip'} onClick={() => setLang('ro')}>
          Română
        </button>
        <button className={lang === 'en' ? 'chip on' : 'chip'} onClick={() => setLang('en')}>
          English
        </button>
      </div>
      {lang === 'ro' ? <HelpRo /> : <HelpEn />}
      <p className="muted small version">
        MedSlot · {lang === 'ro' ? 'Versiune' : 'Version'}: {__APP_VERSION__}
      </p>
    </section>
  );
}

function HelpRo() {
  return (
    <article lang="ro">
      <h1>Instrucțiuni de utilizare</h1>
      <p className="muted">Cuprins: 1 Autentificare · 2 Instalare și actualizare · 3 Meniul aplicației · 4 Vizualizarea programărilor · 5 Programare nouă · 6 Deschidere, status, modificare, anulare · 7 Căutare · 8 Istoric · 9 Setări · 10 Notificări · 11 Roluri · 12 Protecția datelor · 13 Probleme frecvente</p>

      <h2>1. Autentificare</h2>
      <ol>
        <li>Deschideți aplicația și scrieți adresa de email.</li>
        <li>Apăsați <b>Trimite linkul</b>. Veți primi un email cu un link de autentificare.</li>
        <li>Deschideți linkul pe <b>același dispozitiv</b>. Nu există parolă.</li>
        <li>Doar persoanele invitate de administrator pot intra. Dacă emailul nu ajunge, verificați și Spam.</li>
        <li>La final apăsați <b>Ieșire</b> (sus, dreapta), mai ales pe un dispozitiv folosit și de alții.</li>
      </ol>

      <h2>2. Instalare și actualizare</h2>
      <ul>
        <li><b>Android / Chrome:</b> meniul ⋮ → <i>Instalează aplicația</i> (sau <i>Adaugă pe ecranul de pornire</i>).</li>
        <li><b>iPhone / Safari:</b> butonul Partajare → <i>Adaugă pe ecranul principal</i>.</li>
        <li><b>Calculator (Chrome / Edge):</b> pictograma de instalare din bara de adrese.</li>
        <li><b>Versiunea aplicației</b> apare sus, lângă numele MedSlot (de exemplu <i>v3.0</i>). Pe calculator, ținând cursorul deasupra ei, vedeți și data build-ului. Aceeași informație este jos, pe pagina de login, în Setări și aici.</li>
        <li><b>Actualizare:</b> după o lansare nouă, dacă nu vedeți numărul nou de versiune, închideți complet aplicația (o scoateți din aplicațiile deschise) și deschideți-o din nou.</li>
      </ul>

      <h2>3. Meniul aplicației</h2>
      <ul>
        <li><b>Programări:</b> calendarul și programările. <b>Căutare:</b> caută în toate programările, și în cele vechi. <b>Istoric:</b> toate modificările din aplicație. <b>Setări:</b> preferințe, saloane, proceduri, utilizatori. <b>Instrucțiuni:</b> această pagină, în română și engleză (butoanele de sus). <b>Ieșire:</b> deconectare.</li>
        <li>Dacă vedeți bannerul galben <b>MODUL DEMO</b>, aplicația este în versiunea de probă: datele sunt fictive și rămân doar în acest browser. Nu introduceți date reale. <i>Resetează datele demo</i> le readuce la starea inițială.</li>
      </ul>

      <h2>4. Vizualizarea programărilor</h2>
      <p>În pagina <b>Programări</b> alegeți tipul de vizualizare din bara de sus. Alegerea se păstrează pe dispozitivul dumneavoastră.</p>
      <ul>
        <li><b>Timeline:</b> o zi, pe ore. Coloanele sunt saloanele, sau medicii curanți ori primitori (alegeți din <i>Grupare</i>). O atingere pe un spațiu liber adaugă o programare cu ora și coloana deja completate.</li>
        <li><b>Săptămână:</b> calendar cu zilele săptămânii, pe ore. <b>Lună:</b> calendar lunar; apăsați o zi pentru a o deschide în Timeline.</li>
        <li><b>Listă:</b> programările în ordine, grupate pe zile, pentru ziua, săptămâna sau luna aleasă, ori pentru următoarele 30 de zile.</li>
        <li><b>Ocupare:</b> saloanele pe rânduri, zilele pe coloane (7, 14 sau 28 de zile, la alegere). Fiecare celulă arată cât din intervalul 08:00–18:00 este ocupat. Folosiți-o ca să găsiți rapid locuri libere; apăsați o celulă pentru a deschide ziua.</li>
        <li><b>Pe status:</b> coloane pentru Programat, Confirmat, În desfășurare, Efectuat și Anulat / neprezentat, pentru ziua aleasă. Aici puteți schimba statusul (vezi secțiunea 6).</li>
      </ul>
      <ul>
        <li>Folosiți ‹ ›, <b>Azi</b> sau selectorul de dată pentru navigare. Filtrați după salon sau medic. Bifați <b>Arată anulate</b> pentru a vedea programările anulate sau neprezentate.</li>
        <li>Culoarea unei programări arată salonul. Anulatele apar estompate și tăiate, cele efectuate sunt marcate cu ✓, iar cele în desfășurare cu ▶. Linia roșie din Timeline este ora curentă.</li>
        <li>Toți utilizatorii văd aceleași programări, actualizate automat, fără să reîncărcați pagina.</li>
      </ul>

      <h2>5. Programare nouă</h2>
      <ol>
        <li>Apăsați <b>+ Programare nouă</b>, sau atingeți un spațiu liber în Timeline.</li>
        <li>Completați <b>codul pacientului</b> și <b>inițialele</b> (obligatorii).</li>
        <li>Alegeți procedura (durata se completează automat și poate fi schimbată), data, ora, salonul și medicul curant. Medicul primitor este opțional.</li>
        <li>Numele, diagnosticul și notele sunt <b>opționale</b>. Completați-le doar dacă este necesar.</li>
        <li>Dacă salonul sau un medic este deja ocupat în acel interval, apare un mesaj roșu și programarea nu poate fi salvată până nu schimbați ora, salonul sau medicul. Verificarea se face și în baza de date, deci două persoane nu pot rezerva același loc în același timp.</li>
      </ol>

      <h2>6. Deschidere, status, modificare, anulare</h2>
      <ul>
        <li>Apăsați pe o programare pentru a o <b>deschide</b>. Se deschide doar pentru citire: nu se poate modifica din greșeală.</li>
        <li><b>Schimbare rapidă de status, fără editare:</b> în fereastra programării apăsați direct statusul dorit (Programat, Confirmat, În desfășurare, Efectuat, Anulat, Neprezentat). Schimbarea se salvează imediat.</li>
        <li><b>În vizualizarea Pe status</b> puteți trage (drag and drop) o programare în altă coloană sau folosi meniul de status de pe card. Pe telefon folosiți meniul.</li>
        <li>Statusul nu se schimbă singur în funcție de oră: persoana care lucrează îl schimbă când începe sau se termină procedura.</li>
        <li>Pentru a modifica alte date (oră, salon, medic, pacient, note) apăsați <b>Editează</b> în fereastra programării.</li>
        <li>Programările nu se șterg: schimbați statusul în <b>Anulat</b> sau <b>Neprezentat</b>. Salonul se eliberează automat. Dacă reactivați o programare anulată și locul a fost ocupat între timp, apare mesajul de conflict.</li>
        <li>Secțiunea <b>Istoric modificări</b> din fereastra programării arată toate modificările acesteia: cine, ce (valoare veche → nouă) și când.</li>
      </ul>

      <h2>7. Căutare în toate programările</h2>
      <ul>
        <li>Pagina <b>Căutare</b> caută în toate programările, și în cele vechi. Scrieți un cod, inițiale sau un nume și, dacă doriți, restrângeți după procedură, salon, medic, status sau perioadă. Apăsați <b>Resetează</b> pentru a șterge filtrele.</li>
        <li>Bifați <b>Caută și în diagnostic și note</b> dacă trebuie să căutați și în aceste câmpuri.</li>
        <li>Rezultatele sunt ordonate de la cele mai noi, câte 50; <b>Încarcă mai multe</b> afișează restul. Apăsați data unei programări pentru a o deschide, împreună cu istoricul ei, și o puteți edita sau îi puteți schimba statusul de acolo.</li>
        <li><b>Exportă CSV</b> salvează rezultatele într-un fișier pe care îl deschideți în Excel. Fișierul conține doar codul, inițialele, procedura, ora, salonul, medicii și statusul, fără nume sau diagnostic.</li>
      </ul>

      <h2>8. Istoric</h2>
      <p>Pagina <b>Istoric</b> arată toate modificările din aplicație (programări, saloane, proceduri, utilizatori, setări): cine, ce a schimbat (valoarea veche → nouă) și când. Îl puteți filtra după utilizator, tipul acțiunii și perioadă. Istoricul nu poate fi modificat sau șters, iar programările rămân stocate și după anulare.</p>

      <h2>9. Setări</h2>
      <ul>
        <li><b>Preferințe personale:</b> limbă (română / engleză), temă luminoasă, întunecată sau a dispozitivului, mărimea textului. Se păstrează pentru contul dumneavoastră.</li>
        <li><b>Notificările mele:</b> primiți email și, dacă e activat de administrator, SMS (în acest caz introduceți telefonul).</li>
        <li><b>Cabinete și saloane, Proceduri:</b> oricine poate adăuga sau redenumi; la proceduri se stabilește și durata implicită. Elementele nu se șterg, se dezactivează (dispar din listele de alegere, dar rămân în programările vechi).</li>
        <li><b>Utilizatori și roluri:</b> administratorul invită colegi (nume, email, rol) și le poate schimba rolul sau dezactiva contul.</li>
        <li><b>Notificări (toată clinica):</b> administratorul stabilește numele clinicii și poate porni sau opri emailul și SMS-ul. SMS-ul costă per mesaj, de aceea este oprit implicit.</li>
      </ul>

      <h2>10. Notificări</h2>
      <ul>
        <li>La o programare nouă sau la o schimbare de oră, salon, procedură, medic sau status, medicul curant și medicul primitor primesc un email (și SMS, dacă este activat și au telefon completat).</li>
        <li>Mesajul conține doar codul, inițialele, procedura, ora, salonul și statusul, niciodată numele sau diagnosticul.</li>
        <li>Fiecare utilizator își poate opri notificările din Setări. Notificările funcționează doar după conectarea aplicației la baza de date reală, nu în modul demo.</li>
      </ul>

      <h2>11. Roluri</h2>
      <ul>
        <li><b>Medic curant, Persoană programări, Medic primitor:</b> pot vedea, adăuga și modifica programări, schimba statusul și folosi căutarea și istoricul. Orice modificare este înregistrată cu numele autorului.</li>
        <li><b>Administrator:</b> are în plus dreptul să invite utilizatori, să le schimbe rolul și să stabilească setările clinicii (email, SMS). Nimeni nu poate șterge programări sau istoricul.</li>
      </ul>

      <h2>12. Protecția datelor</h2>
      <ul>
        <li>Identificați pacienții prin cod și inițiale. Introduceți numele și diagnosticul doar când este necesar.</li>
        <li>Nu lăsați aplicația deschisă pe un dispozitiv comun. Apăsați <b>Ieșire</b> la final.</li>
        <li>Emailurile de notificare conțin doar codul, inițialele, procedura, ora și salonul. Exportul CSV nu conține nume sau diagnostic.</li>
      </ul>

      <h2>13. Probleme frecvente</h2>
      <ul>
        <li><b>Nu primesc emailul cu linkul:</b> verificați Spam și adresa scrisă. Doar adresele invitate de administrator funcționează.</li>
        <li><b>Linkul nu mă conectează:</b> deschideți-l pe același dispozitiv și în același browser în care ați cerut linkul, și cereți unul nou dacă a trecut mult timp.</li>
        <li><b>Nu pot salva o programare:</b> citiți mesajul roșu: salonul sau medicul este ocupat în acel interval. Schimbați ora, salonul sau medicul.</li>
        <li><b>Nu văd funcțiile noi:</b> închideți complet aplicația și deschideți-o din nou, apoi verificați numărul versiunii sus.</li>
        <li><b>Nu găsesc o programare:</b> bifați <b>Arată anulate</b> sau folosiți pagina <b>Căutare</b>.</li>
      </ul>
    </article>
  );
}

function HelpEn() {
  return (
    <article lang="en">
      <h1>User instructions</h1>
      <p className="muted">Contents: 1 Signing in · 2 Installing and updating · 3 App menu · 4 Viewing appointments · 5 New appointment · 6 Opening, status, changing, cancelling · 7 Search · 8 History · 9 Settings · 10 Notifications · 11 Roles · 12 Data protection · 13 Common problems</p>

      <h2>1. Signing in</h2>
      <ol>
        <li>Open the app and type your email address.</li>
        <li>Press <b>Send link</b>. You will receive an email with a sign-in link.</li>
        <li>Open the link on the <b>same device</b>. There is no password.</li>
        <li>Only people invited by the administrator can sign in. If the email does not arrive, check Spam too.</li>
        <li>When you are done press <b>Sign out</b> (top right), especially on a device others use.</li>
      </ol>

      <h2>2. Installing and updating</h2>
      <ul>
        <li><b>Android / Chrome:</b> menu ⋮ → <i>Install app</i> (or <i>Add to Home screen</i>).</li>
        <li><b>iPhone / Safari:</b> Share button → <i>Add to Home Screen</i>.</li>
        <li><b>Computer (Chrome / Edge):</b> the install icon in the address bar.</li>
        <li><b>The app version</b> is shown at the top, next to the MedSlot name (for example <i>v3.0</i>). On a computer, hover over it to see the build date too. The same information is at the bottom of the login page, in Settings and here.</li>
        <li><b>Updating:</b> after a new release, if you do not see the new version number, close the app completely (remove it from your open apps) and open it again.</li>
      </ul>

      <h2>3. App menu</h2>
      <ul>
        <li><b>Schedule:</b> the calendar and appointments. <b>Search:</b> searches every appointment, including old ones. <b>History:</b> every change made in the app. <b>Settings:</b> preferences, rooms, procedures, users. <b>Instructions:</b> this page, in Romanian and English (buttons at the top). <b>Sign out:</b> log out.</li>
        <li>If you see the yellow <b>DEMO MODE</b> banner, the app is the trial version: the data is fake and stays only in this browser. Do not enter real data. <i>Reset demo data</i> returns it to the starting state.</li>
      </ul>

      <h2>4. Viewing appointments</h2>
      <p>On the <b>Schedule</b> page, pick a view from the bar at the top. Your choice is remembered on this device.</p>
      <ul>
        <li><b>Timeline:</b> one day, by hour. Columns are rooms, or attending or receiving doctors (choose in <i>Group by</i>). Tap an empty slot to add an appointment with the time and column already filled in.</li>
        <li><b>Week:</b> a calendar of the week's days, by hour. <b>Month:</b> a monthly calendar; tap a day to open it in Timeline.</li>
        <li><b>List:</b> appointments in order, grouped by day, for the chosen day, week or month, or for the next 30 days.</li>
        <li><b>Occupancy:</b> rooms as rows, days as columns (7, 14 or 28 days, your choice). Each cell shows how much of the 08:00–18:00 window is booked. Use it to find free slots quickly; tap a cell to open that day.</li>
        <li><b>By status:</b> columns for Planned, Confirmed, In progress, Done and Cancelled / no-show, for the chosen day. You can change status here (see section 6).</li>
      </ul>
      <ul>
        <li>Use ‹ ›, <b>Today</b> or the date picker to move around. Filter by room or doctor. Tick <b>Show cancelled</b> to see cancelled or no-show appointments.</li>
        <li>An appointment's colour shows its room. Cancelled ones look faded and struck through, done ones are marked ✓ and ones in progress ▶. The red line in Timeline is the current time.</li>
        <li>Everyone sees the same appointments, updated automatically, with no need to reload the page.</li>
      </ul>

      <h2>5. New appointment</h2>
      <ol>
        <li>Press <b>+ New appointment</b>, or tap an empty slot in Timeline.</li>
        <li>Fill in the <b>patient code</b> and <b>initials</b> (required).</li>
        <li>Pick the procedure (the duration fills in automatically and can be changed), date, time, room and attending doctor. The receiving doctor is optional.</li>
        <li>Name, diagnosis and notes are <b>optional</b>. Fill them in only when needed.</li>
        <li>If the room or a doctor is already booked in that interval, a red message appears and the appointment cannot be saved until you change the time, room or doctor. The check is also made in the database, so two people can never book the same slot at once.</li>
      </ol>

      <h2>6. Opening, status, changing, cancelling</h2>
      <ul>
        <li>Tap an appointment to <b>open</b> it. It opens read-only, so it cannot be changed by accident.</li>
        <li><b>Quick status change, without editing:</b> in the appointment window tap the status you want (Planned, Confirmed, In progress, Done, Cancelled, No-show). The change is saved immediately.</li>
        <li><b>In the By status view</b> you can drag and drop an appointment to another column or use the status menu on the card. On a phone, use the menu.</li>
        <li>The status never changes by itself based on the time: the person working changes it when the procedure starts or ends.</li>
        <li>To change other details (time, room, doctor, patient, notes) press <b>Edit</b> in the appointment window.</li>
        <li>Appointments are never deleted: set the status to <b>Cancelled</b> or <b>No-show</b>. The room is freed automatically. If you reactivate a cancelled appointment and the slot was taken in the meantime, the conflict message appears.</li>
        <li>The <b>Change history</b> section in the appointment window shows every change made to it: who, what (old value → new value) and when.</li>
      </ul>

      <h2>7. Searching all appointments</h2>
      <ul>
        <li>The <b>Search</b> page searches every appointment, including old ones. Type a code, initials or a name and, if you like, narrow it down by procedure, room, doctor, status or date range. Press <b>Reset</b> to clear the filters.</li>
        <li>Tick <b>Also search diagnosis and notes</b> if you need to search those fields too.</li>
        <li>Results are sorted newest first, 50 at a time; <b>Load more</b> shows the rest. Tap an appointment's date to open it together with its history; you can edit it or change its status from there.</li>
        <li><b>Export CSV</b> saves the results to a file you can open in Excel. The file contains only code, initials, procedure, time, room, doctors and status, with no name or diagnosis.</li>
      </ul>

      <h2>8. History</h2>
      <p>The <b>History</b> page lists every change in the app (appointments, rooms, procedures, users, settings): who changed what (old value → new value) and when. You can filter it by user, type of action and date range. The history cannot be edited or deleted, and appointments stay stored even after they are cancelled.</p>

      <h2>9. Settings</h2>
      <ul>
        <li><b>Personal preferences:</b> language (Romanian / English), light, dark or device theme, text size. They are kept for your account.</li>
        <li><b>My notifications:</b> you receive email and, if the administrator turned it on, SMS (in that case enter your phone number).</li>
        <li><b>Offices and rooms, Procedures:</b> anyone can add or rename; for procedures you also set the default duration. Items are never deleted, only deactivated (they disappear from the pick lists but stay in old appointments).</li>
        <li><b>Users and roles:</b> the administrator invites colleagues (name, email, role) and can change their role or deactivate their account.</li>
        <li><b>Notifications (whole clinic):</b> the administrator sets the clinic name and can turn email and SMS on or off. SMS costs money per message, so it is off by default.</li>
      </ul>

      <h2>10. Notifications</h2>
      <ul>
        <li>When an appointment is created, or its time, room, procedure, doctor or status changes, the attending and receiving doctors get an email (and an SMS, if enabled and they have a phone number).</li>
        <li>The message contains only the code, initials, procedure, time, room and status, never the name or diagnosis.</li>
        <li>Each user can turn their own notifications off in Settings. Notifications only work once the app is connected to the real database, not in demo mode.</li>
      </ul>

      <h2>11. Roles</h2>
      <ul>
        <li><b>Attending doctor, Scheduler, Receiving doctor:</b> can view, add and change appointments, change status, and use search and history. Every change is recorded with the author's name.</li>
        <li><b>Administrator:</b> can in addition invite users, change their role and set the clinic settings (email, SMS). Nobody can delete appointments or the history.</li>
      </ul>

      <h2>12. Data protection</h2>
      <ul>
        <li>Identify patients by code and initials. Enter name and diagnosis only when needed.</li>
        <li>Do not leave the app open on a shared device. Press <b>Sign out</b> when done.</li>
        <li>Notification emails contain only the code, initials, procedure, time and room. The CSV export has no name or diagnosis.</li>
      </ul>

      <h2>13. Common problems</h2>
      <ul>
        <li><b>I do not get the sign-in email:</b> check Spam and the address you typed. Only addresses invited by the administrator work.</li>
        <li><b>The link does not sign me in:</b> open it on the same device and in the same browser where you asked for it, and request a new one if a long time has passed.</li>
        <li><b>I cannot save an appointment:</b> read the red message: the room or a doctor is booked in that interval. Change the time, room or doctor.</li>
        <li><b>I do not see the new features:</b> close the app completely and open it again, then check the version number at the top.</li>
        <li><b>I cannot find an appointment:</b> tick <b>Show cancelled</b> or use the <b>Search</b> page.</li>
      </ul>
    </article>
  );
}
