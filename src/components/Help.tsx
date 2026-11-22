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
    </section>
  );
}

function HelpRo() {
  return (
    <article lang="ro">
      <h1>Instrucțiuni de utilizare</h1>

      <h2>1. Autentificare</h2>
      <ol>
        <li>Deschideți aplicația și scrieți adresa de email.</li>
        <li>Apăsați <b>Trimite linkul</b>. Veți primi un email cu un link de autentificare.</li>
        <li>Deschideți linkul pe <b>același dispozitiv</b>. Nu există parolă.</li>
        <li>Doar persoanele invitate de administrator pot intra.</li>
      </ol>

      <h2>2. Instalare pe telefon sau calculator</h2>
      <ul>
        <li><b>Android / Chrome:</b> meniul ⋮ → <i>Instalează aplicația</i> (sau <i>Adaugă pe ecranul de pornire</i>).</li>
        <li><b>iPhone / Safari:</b> butonul Partajare → <i>Adaugă pe ecranul principal</i>.</li>
        <li><b>Calculator (Chrome / Edge):</b> pictograma de instalare din bara de adrese.</li>
      </ul>

      <h2>3. Vizualizarea programărilor</h2>
      <p>În pagina <b>Programări</b> alegeți tipul de vizualizare din bara de sus. Alegerea se păstrează pe dispozitivul dumneavoastră.</p>
      <ul>
        <li><b>Timeline:</b> o zi, pe ore. Coloanele sunt saloanele, sau medicii curanți ori primitori (alegeți din <i>Grupare</i>). O atingere pe un spațiu liber adaugă o programare cu ora și coloana deja completate.</li>
        <li><b>Săptămână:</b> calendar cu zilele săptămânii, pe ore. <b>Lună:</b> calendar lunar; apăsați o zi pentru a o deschide în Timeline.</li>
        <li><b>Listă:</b> programările în ordine, grupate pe zile, pentru ziua, săptămâna sau luna aleasă, ori pentru următoarele 30 de zile.</li>
        <li><b>Ocupare:</b> saloanele pe rânduri, zilele pe coloane. Fiecare celulă arată cât din intervalul 08:00–18:00 este ocupat. Folosiți-o ca să găsiți rapid locuri libere; apăsați o celulă pentru a deschide ziua.</li>
        <li><b>Pe status:</b> coloane pentru Programat, Confirmat, În desfășurare, Efectuat și Anulat, pentru ziua aleasă.</li>
      </ul>
      <ul>
        <li>Folosiți ‹ ›, <b>Azi</b> sau selectorul de dată pentru navigare. Filtrați după salon sau medic. Bifați <b>Arată anulate</b> pentru a le vedea.</li>
        <li>Culoarea unei programări arată salonul. Linia roșie din Timeline este ora curentă.</li>
        <li>Toți utilizatorii văd aceleași programări, actualizate automat.</li>
      </ul>

      <h2>4. Programare nouă</h2>
      <ol>
        <li>Apăsați <b>+ Programare nouă</b>.</li>
        <li>Completați <b>codul pacientului</b> și <b>inițialele</b> (obligatorii).</li>
        <li>Alegeți procedura (durata se completează automat), data, ora, salonul și medicul curant. Medicul primitor este opțional.</li>
        <li>Numele, diagnosticul și notele sunt <b>opționale</b>. Completați-le doar dacă este necesar.</li>
        <li>Dacă salonul sau un medic este deja ocupat, apare un mesaj roșu și programarea nu poate fi salvată până nu schimbați ora, salonul sau medicul.</li>
      </ol>

      <h2>5. Modificare și anulare</h2>
      <ul>
        <li>Apăsați pe o programare pentru a o modifica.</li>
        <li>Programările nu se șterg: schimbați statusul în <b>Anulat</b> sau <b>Neprezentat</b>. Salonul se eliberează automat.</li>
        <li>Butonul <b>Istoric</b> din fereastra programării arată toate modificările acesteia.</li>
      </ul>

      <h2>6. Căutare în toate programările</h2>
      <ul>
        <li>Pagina <b>Căutare</b> caută în toate programările, și în cele vechi. Scrieți un cod, inițiale sau un nume și, dacă doriți, restrângeți după procedură, salon, medic, status sau perioadă.</li>
        <li>Bifați <b>Caută și în diagnostic și note</b> dacă trebuie să căutați și în aceste câmpuri.</li>
        <li>Rezultatele sunt ordonate de la cele mai noi. Apăsați data unei programări pentru a o deschide, împreună cu istoricul ei.</li>
        <li><b>Exportă CSV</b> salvează rezultatele într-un fișier pe care îl deschideți în Excel. Fișierul conține doar codul, inițialele, procedura, ora, salonul, medicii și statusul, fără nume sau diagnostic.</li>
      </ul>

      <h2>7. Istoric</h2>
      <p>Pagina <b>Istoric</b> arată toate modificările din aplicație: cine, ce a schimbat (valoarea veche → nouă) și când. Îl puteți filtra după utilizator, tipul acțiunii și perioadă. Istoricul nu poate fi modificat sau șters, iar programările rămân stocate și după anulare.</p>

      <h2>8. Setări</h2>
      <ul>
        <li><b>Preferințe personale:</b> limbă (română / engleză), temă luminoasă sau întunecată, mărimea textului.</li>
        <li><b>Notificările mele:</b> email și, dacă e activat de administrator, SMS.</li>
        <li><b>Cabinete și saloane, Proceduri:</b> oricine poate adăuga sau redenumi. Elementele nu se șterg, se dezactivează.</li>
        <li><b>Utilizatori și roluri:</b> administratorul invită colegi și le stabilește rolul (medic curant, persoană programări, medic primitor, administrator).</li>
        <li><b>Notificări (toată clinica):</b> administratorul poate porni sau opri emailul și SMS-ul. SMS-ul costă per mesaj, de aceea este oprit implicit.</li>
      </ul>

      <h2>9. Protecția datelor</h2>
      <ul>
        <li>Identificați pacienții prin cod și inițiale. Introduceți numele și diagnosticul doar când este necesar.</li>
        <li>Nu lăsați aplicația deschisă pe un dispozitiv comun. Apăsați <b>Ieșire</b> la final.</li>
        <li>Emailurile de notificare conțin doar codul, inițialele, procedura, ora și salonul.</li>
      </ul>
    </article>
  );
}

function HelpEn() {
  return (
    <article lang="en">
      <h1>User instructions</h1>

      <h2>1. Signing in</h2>
      <ol>
        <li>Open the app and type your email address.</li>
        <li>Press <b>Send link</b>. You will receive an email with a sign-in link.</li>
        <li>Open the link on the <b>same device</b>. There is no password.</li>
        <li>Only people invited by the administrator can sign in.</li>
      </ol>

      <h2>2. Installing on a phone or computer</h2>
      <ul>
        <li><b>Android / Chrome:</b> menu ⋮ → <i>Install app</i> (or <i>Add to Home screen</i>).</li>
        <li><b>iPhone / Safari:</b> Share button → <i>Add to Home Screen</i>.</li>
        <li><b>Computer (Chrome / Edge):</b> the install icon in the address bar.</li>
      </ul>

      <h2>3. Viewing appointments</h2>
      <p>On the <b>Schedule</b> page, pick a view from the bar at the top. Your choice is remembered on this device.</p>
      <ul>
        <li><b>Timeline:</b> one day, by hour. Columns are rooms, or attending or receiving doctors (choose in <i>Group by</i>). Tap an empty slot to add an appointment with the time and column already filled in.</li>
        <li><b>Week:</b> a calendar of the week's days, by hour. <b>Month:</b> a monthly calendar; tap a day to open it in Timeline.</li>
        <li><b>List:</b> appointments in order, grouped by day, for the chosen day, week or month, or for the next 30 days.</li>
        <li><b>Occupancy:</b> rooms as rows, days as columns. Each cell shows how much of the 08:00–18:00 window is booked. Use it to find free slots quickly; tap a cell to open that day.</li>
        <li><b>By status:</b> columns for Planned, Confirmed, In progress, Done and Cancelled, for the chosen day.</li>
      </ul>
      <ul>
        <li>Use ‹ ›, <b>Today</b> or the date picker to move around. Filter by room or doctor. Tick <b>Show cancelled</b> to see them.</li>
        <li>An appointment's colour shows its room. The red line in Timeline is the current time.</li>
        <li>Everyone sees the same appointments, updated automatically.</li>
      </ul>

      <h2>4. New appointment</h2>
      <ol>
        <li>Press <b>+ New appointment</b>.</li>
        <li>Fill in the <b>patient code</b> and <b>initials</b> (required).</li>
        <li>Pick the procedure (the duration fills in automatically), date, time, room and attending doctor. The receiving doctor is optional.</li>
        <li>Name, diagnosis and notes are <b>optional</b>. Fill them in only when needed.</li>
        <li>If the room or a doctor is already booked, a red message appears and the appointment cannot be saved until you change the time, room or doctor.</li>
      </ol>

      <h2>5. Changing and cancelling</h2>
      <ul>
        <li>Tap an appointment to change it.</li>
        <li>Appointments are never deleted: set the status to <b>Cancelled</b> or <b>No-show</b>. The room is freed automatically.</li>
        <li>The <b>History</b> button in the appointment window shows every change made to it.</li>
      </ul>

      <h2>6. Searching all appointments</h2>
      <ul>
        <li>The <b>Search</b> page searches every appointment, including old ones. Type a code, initials or a name and, if you like, narrow it down by procedure, room, doctor, status or date range.</li>
        <li>Tick <b>Also search diagnosis and notes</b> if you need to search those fields too.</li>
        <li>Results are sorted newest first. Tap an appointment's date to open it together with its history.</li>
        <li><b>Export CSV</b> saves the results to a file you can open in Excel. The file contains only code, initials, procedure, time, room, doctors and status, with no name or diagnosis.</li>
      </ul>

      <h2>7. History</h2>
      <p>The <b>History</b> page lists every change in the app: who changed what (old value → new value) and when. You can filter it by user, type of action and date range. The history cannot be edited or deleted, and appointments stay stored even after they are cancelled.</p>

      <h2>8. Settings</h2>
      <ul>
        <li><b>Personal preferences:</b> language (Romanian / English), light or dark theme, text size.</li>
        <li><b>My notifications:</b> email and, if the administrator turned it on, SMS.</li>
        <li><b>Offices and rooms, Procedures:</b> anyone can add or rename. Items are never deleted, only deactivated.</li>
        <li><b>Users and roles:</b> the administrator invites colleagues and sets their role (attending doctor, scheduler, receiving doctor, administrator).</li>
        <li><b>Notifications (whole clinic):</b> the administrator can turn email and SMS on or off. SMS costs money per message, so it is off by default.</li>
      </ul>

      <h2>9. Data protection</h2>
      <ul>
        <li>Identify patients by code and initials. Enter name and diagnosis only when needed.</li>
        <li>Do not leave the app open on a shared device. Press <b>Sign out</b> when done.</li>
        <li>Notification emails contain only the code, initials, procedure, time and room.</li>
      </ul>
    </article>
  );
}
