// Interfață SMS. Implicit: STUB (nu trimite nimic, doar scrie în log).
// SMS-ul are cost per mesaj, de aceea e dezactivat implicit în Setări.
// Pentru a activa un furnizor real, implementați SmsProvider și setați
// variabila SMS_PROVIDER (ex. "twilio").

export interface SmsProvider {
  send(to: string, text: string): Promise<void>;
}

class StubSms implements SmsProvider {
  async send(to: string, text: string) {
    // Nu logăm textul complet (poate conține date despre pacient).
    console.log(`[sms-stub] would send ${text.length} chars to ${to.slice(0, 4)}…`);
  }
}

class TwilioSms implements SmsProvider {
  constructor(private sid: string, private token: string, private from: string) {}
  async send(to: string, text: string) {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${this.sid}:${this.token}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: this.from, Body: text }),
    });
    if (!res.ok) throw new Error(`twilio ${res.status}`);
  }
}

export function getSmsProvider(): SmsProvider {
  const p = Deno.env.get('SMS_PROVIDER') ?? 'stub';
  if (p === 'twilio') {
    return new TwilioSms(
      Deno.env.get('TWILIO_ACCOUNT_SID')!,
      Deno.env.get('TWILIO_AUTH_TOKEN')!,
      Deno.env.get('TWILIO_FROM')!,
    );
  }
  return new StubSms();
}
