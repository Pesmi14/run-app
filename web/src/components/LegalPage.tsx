import Link from "next/link";
import PublicFooter from "./PublicFooter";
import styles from "./LegalPage.module.css";

type DocumentType = "cookies" | "privacy" | "terms" | "community" | "deletion";
type Section = { title: string; paragraphs?: string[]; bullets?: string[] };
type Document = { title: string; intro: string; sections: Section[] };

const email = "sprintuy@lokinstudio.com";
const docs: Record<DocumentType, Document> = {
  cookies: {
    title: "Cookies",
    intro: "Informace o používání cookies a podobných technologií na webu Sprintuy.",
    sections: [
      { title: "Co jsou cookies", paragraphs: ["Cookies jsou malé datové záznamy ukládané v prohlížeči. Podobnou funkci může mít místní úložiště (localStorage). Mohou sloužit k přihlášení, bezpečnosti, zapamatování nastavení nebo měření návštěvnosti."] },
      { title: "Nezbytné technologie", paragraphs: ["Web a administrace Sprintuy používají technologie nutné pro přihlášení, udržení relace a bezpečný provoz, včetně autentizačních cookies používaných službou Supabase. Jejich použití nevyžaduje souhlas s volitelným sledováním.", "Zavření informační lišty ukládáme do místního úložiště pod klíčem sprintuy-cookie-notice-v1. Tento záznam slouží pouze k zapamatování, že jsi informaci viděl/a, a není souhlasem s analytickými nebo reklamními cookies."] },
      { title: "Analytické a marketingové cookies", paragraphs: ["Připravená informační lišta nepovoluje ani nespouští žádné analytické či marketingové nástroje. Pokud budou na webu v budoucnu používány, doplníme konkrétní seznam a před jejich spuštěním si vyžádáme potřebný souhlas."] },
      { title: "Jak cookies spravovat", paragraphs: ["Cookies a místní úložiště můžeš smazat v nastavení prohlížeče. Odstranění autentizačních cookies tě může odhlásit z administrace. Tlačítko „Nastavení cookies“ v zápatí znovu zobrazí informační lištu; zatím zde nejsou žádné volitelné kategorie k zapnutí."] },
      { title: "Kontakt", paragraphs: [`S dotazy ohledně cookies nás kontaktuj na ${email}.`] },
    ],
  },
  privacy: {
    title: "Zásady ochrany osobních údajů",
    intro: "Jak Sprintuy pracuje s údaji při registraci, používání mobilní aplikace, komunitních funkcí a čekací listiny.",
    sections: [
      { title: "Správce údajů", paragraphs: [`Správcem osobních údajů je Petr Šmíd, Česká republika. Kontakt: ${email}. Sprintuy je služba pro objevování závodů a běžeckých komunit.`] },
      { title: "Jaké údaje můžeme zpracovávat", bullets: ["Údaje účtu: e-mail, identifikátor účtu a přihlašovací údaje zpracovávané prostřednictvím autentizační služby.", "Údaje profilu: uživatelské jméno, jméno, avatar, kraj, dobrovolně vložené odkazy a další informace vyplněné uživatelem.", "Aktivitu v aplikaci: uložené závody, plánované účasti, přátele, osobní rekordy, přihlášení k runclubovým výběhům, žádosti o eventy a účasti v soutěžích.", "Komunitní obsah, zprávy při zpětné vazbě a podklady pro řešení nahlášení nebo bezpečnostních incidentů.", "Údaje čekací listiny: e-mail, zvolený operační systém a datum přihlášení.", "Nezbytné technické a bezpečnostní údaje související s provozem webu a aplikace."] },
      { title: "Účely a právní základy", paragraphs: ["Údaje potřebné k vedení účtu, zobrazování profilu a poskytování funkcí zpracováváme za účelem plnění podmínek služby (čl. 6 odst. 1 písm. b GDPR). Bezpečnost, ochrana před zneužitím a vyřízení nahlášení mohou vycházet z oprávněného zájmu (čl. 6 odst. 1 písm. f GDPR).", "E-mail z čekací listiny používáme pro informování o spuštění a souvisejících novinkách na základě přihlášení uživatele a jeho souhlasu, je-li vyžadován (čl. 6 odst. 1 písm. a GDPR). Souhlas lze kdykoli odvolat e-mailem. Údaje vyžadované právními předpisy uchováváme pro splnění zákonné povinnosti (čl. 6 odst. 1 písm. c GDPR)."] },
      { title: "Viditelnost údajů a sdílení", paragraphs: ["Některé údaje profilu a komunitních aktivit mohou být podle funkce viditelné ostatním uživatelům. Žádosti o účast na eventech posuzuje správce nebo příslušný oprávněný organizátor, pokud bude taková funkce výslovně zavedena.", "Pro provoz služby používáme technické dodavatele, zejména Supabase (databáze a autentizace) a Vercel (webový hosting). Údaje můžeme předat také tehdy, vyžaduje-li to zákon. Případné předávání mimo EHP musí být zabezpečeno odpovídajícím právním mechanismem."] },
      { title: "Jak dlouho údaje uchováváme", paragraphs: ["Údaje účtu a aktivit držíme po dobu aktivního účtu, pokud nejsou potřebné déle k plnění zákonné povinnosti nebo ochraně právních nároků. Údaje čekací listiny uchováváme do splnění účelu informování o spuštění nebo do odvolání souhlasu, podle toho, co nastane dříve. Bezpečnostní záznamy pouze po dobu přiměřenou jejich účelu.", "Konkrétní technické retenční lhůty pro zálohy a logy je před zveřejněním finálních zásad potřeba ověřit podle produkčního nastavení. Ani odstranění účtu nemusí znamenat okamžité vymazání každé bezpečnostní zálohy."] },
      { title: "Tvoje práva", paragraphs: ["Můžeš požádat o přístup, opravu, výmaz, omezení zpracování nebo přenositelnost údajů, pokud jsou splněny zákonné podmínky. Můžeš vznést námitku proti zpracování na základě oprávněného zájmu a kdykoli odvolat souhlas, pokud na něm zpracování stojí. Máš právo podat stížnost u Úřadu pro ochranu osobních údajů (uoou.gov.cz).", `S žádostí napiš na ${email}. Informace ke smazání účtu najdeš také na stránce /delete-account.`] },
      { title: "Aktualizace zásad", paragraphs: ["Zásady můžeme aktualizovat při změnách funkcí, dodavatelů nebo právních požadavků. Aktuální znění bude dostupné na tomto webu."] },
    ],
  },
  terms: {
    title: "Podmínky použití",
    intro: "Pravidla používání webové a mobilní služby Sprintuy, jejích závodních a komunitních funkcí.",
    sections: [
      { title: "Provozovatel a rozsah služby", paragraphs: [`Sprintuy provozuje Petr Šmíd, Česká republika. Kontakt: ${email}. Sprintuy umožňuje objevovat závody, spravovat profil, ukládat závody, označovat plánované účasti, spojovat se s přáteli, sledovat runcluby, výběhy, komunitní eventy a soutěže.`] },
      { title: "Registrace a účet", paragraphs: ["Při registraci uváděj pravdivé údaje a používej účet v souladu s právními předpisy. Chraň svoje přihlašovací údaje. Za aktivity uskutečněné prostřednictvím svého účtu odpovídáš v rozsahu stanoveném právem. Pokud máš podezření na zneužití, neprodleně nás kontaktuj.", "Nesmíš vytvářet falešné identity za účelem obtěžování nebo obcházení omezení. Účet můžeš zrušit postupem uvedeným na stránce Smazání účtu a dat."] },
      { title: "Komunitní funkce a obsah", paragraphs: ["Funkce přátel, profilů, runclubů, výběhů a dalších komunitních aktivit používej ohleduplně. Nezveřejňuj nezákonný, nenávistný, obtěžující, násilný, sexuálně nevhodný nebo jinak škodlivý obsah, spam ani obsah porušující práva dalších osob.", "Obsah, který do Sprintuy vložíš, musíš být oprávněn/a sdílet. Poskytuješ nám v nezbytném rozsahu nevýhradní oprávnění jej zobrazovat a technicky zpracovávat pro fungování služby. Tvá práva k obsahu tím nezanikají."] },
      { title: "Runcluby, eventy a soutěže", paragraphs: ["Runclubové výběhy mohou umožnit označení „Budu se účastnit“. U komunitních eventů může být nutné požádat o účast a získat schválení. Eventy mohou mít kapacitu, omezení nebo cenu. Přihlášení do soutěže se řídí zveřejněnými pravidly konkrétní soutěže, termíny a případnými omezeními účasti.", "Označení účasti v aplikaci samo o sobě nemusí představovat platnou registraci u externího pořadatele, rezervaci místa nebo zaplacení vstupného. Pořadatel může účast podmínit vlastní registrací a splněním dalších podmínek."] },
      { title: "Údaje o závodech a externí služby", paragraphs: ["Sprintuy není pořadatelem závodů, runclubových výběhů ani externích eventů, pokud není výslovně uvedeno jinak. Informace o termínech, cenách, trasách, kapacitě, registracích nebo storno podmínkách se mohou změnit.", "Před účastí si rozhodující informace vždy ověř přímo u pořadatele. Externí weby, platební a registrační služby se řídí vlastními podmínkami a zásadami ochrany osobních údajů. Za jejich obsah nebo dostupnost neodpovídáme v rozsahu povoleném právem."] },
      { title: "Bezpečnost sportovních aktivit", paragraphs: ["Sportovní aktivity absolvuješ na vlastní odpovědnost s ohledem na svůj zdravotní stav, schopnosti a bezpečnostní podmínky. Dodržuj pokyny pořadatelů a pravidla provozu. Sprintuy neposkytuje zdravotní ani lékařské doporučení. V případě pochybností o zdravotní způsobilosti se obrať na kvalifikovaného odborníka."] },
      { title: "Moderace a omezení účtu", paragraphs: ["Při porušování pravidel můžeme po přiměřeném posouzení skrýt nebo odstranit obsah, omezit přístup k funkcím či dočasně pozastavit nebo zrušit účet, v závislosti na závažnosti porušení a platných právních předpisech. Podezřelý obsah a uživatele lze nahlásit přes dostupnou funkci aplikace nebo e-mailem."] },
      { title: "Duševní vlastnictví", paragraphs: ["Název, grafika, zdrojové materiály a vlastní obsah Sprintuy mohou být chráněny autorským právem a dalšími právy. Bez oprávnění je nekopíruj, nešiř ani nevyužívej komerčně. Obsah externích organizátorů náleží příslušným vlastníkům."] },
      { title: "Změny služby a podmínek", paragraphs: ["Funkce Sprintuy se mohou vyvíjet. Podmínky můžeme přiměřeně měnit; o významných změnách budeme informovat vhodným způsobem. Nic v těchto podmínkách neomezuje práva, která ti náleží podle kogentních právních předpisů."] },
      { title: "Kontakt", paragraphs: [`Pro otázky k podmínkám napiš na ${email}.`] },
    ],
  },
  community: {
    title: "Pravidla komunity",
    intro: "Sprintuy má být bezpečné a přátelské místo pro běžce, runcluby a pořadatele komunitních akcí.",
    sections: [
      { title: "Chovej se s respektem", bullets: ["Neobtěžuj, nevyhrožuj a nezastrašuj ostatní uživatele.", "Nezveřejňuj nenávistný, násilný, sexuálně nevhodný, ponižující nebo jinak nezákonný obsah.", "Nezveřejňuj cizí osobní údaje bez oprávnění; respektuj soukromí ostatních."] },
      { title: "Žádný spam ani podvody", bullets: ["Nešíř spam, phishing, podvodné nabídky nebo škodlivé odkazy.", "Nevydávej se za jiného uživatele, runclub, pořadatele ani za Sprintuy.", "Nezneužívej přihlášky na výběhy, žádosti o eventy ani soutěže."] },
      { title: "Nahlášení a blokování", paragraphs: [`Závadný obsah nebo účet můžeš nahlásit prostřednictvím funkce aplikace, pokud je dostupná, nebo napsat na ${email} s popisem situace. Pokud aplikace nabízí blokování uživatele, můžeš tuto funkci použít k omezení interakce. Pokud dostupná není, kontaktuj nás.`] },
      { title: "Moderace", paragraphs: ["Sprintuy může nahlášení prověřit, odstranit nebo skrýt obsah a podle závažnosti omezit, pozastavit nebo zrušit účet. Závažné porušení pravidel může vést k okamžitému zásahu. V případě nesouhlasu s rozhodnutím nám napiš na uvedený e-mail."] },
      { title: "Bezpečné běhání", paragraphs: ["Respektuj organizátory, další účastníky, dopravní pravidla i prostředí. Účast na běžeckých akcích nezaručuje Sprintuy; podmínky a bezpečnostní pokyny určuje příslušný organizátor."] },
    ],
  },
  deletion: {
    title: "Smazání účtu a dat",
    intro: "Chceš smazat účet Sprintuy? Tady najdeš postup i informace o tom, co se s tvými daty stane.",
    sections: [
      { title: "Jak požádat o smazání v aplikaci", paragraphs: ["V mobilní aplikaci Sprintuy otevři svůj profil a vyhledej v nastavení účtu volbu pro smazání účtu. Pokud už v tvé verzi aplikace tato možnost existuje, postupuj podle potvrzovacího průvodce.", "Pokud možnost nenajdeš, aplikaci už nemáš nebo smazání nefunguje, můžeš o smazání požádat také e-mailem. Nemusíš si kvůli tomu aplikaci znovu instalovat."] },
      { title: "Smazání přes e-mail", paragraphs: [`Pošli žádost na ${email} z e-mailové adresy propojené s tvým účtem a do předmětu napiš „Smazání účtu Sprintuy“. Z bezpečnostních důvodů si můžeme vyžádat přiměřené ověření, že účet patří tobě. Nikdy nám neposílej heslo.`] },
      { title: "Jaká data se smažou", bullets: ["Uživatelský účet a přihlašovací vazba.", "Údaje profilu, včetně avatara a dobrovolně uvedených odkazů.", "Uložené závody, naplánované účasti, osobní rekordy a propojení s přáteli.", "Přihlášení k runclubovým výběhům, žádosti o eventy a soutěžní účasti navázané na účet, pokud jejich uchování není nezbytné z právních důvodů.", "Další osobní údaje spojené s účtem, které nemusíme uchovávat ze zákona nebo k ochraně právních nároků."] },
      { title: "Co může zůstat zachováno", paragraphs: ["V nezbytném rozsahu mohou být určité údaje uchovány po dobu vyžadovanou zákonem, například pro vyřízení právních povinností, bezpečnostních incidentů nebo právních nároků. Technické zálohy se mohou mazat podle příslušného zálohovacího cyklu. Údaje nesouvisející s tvým účtem, například obecné informace o závodech, smazáním účtu nezanikají.", "Konkrétní doby uchování vychází ze skutečného provozu, účelu zpracování a zákonných povinností; pro dotaz k tvému účtu nás kontaktuj."] },
      { title: "Kontakt a pomoc", paragraphs: [`Pokud se ti smazání nedaří nebo máš otázku ohledně osobních údajů, napiš na ${email}. Žádost o výmaz osobních údajů můžeš podat také podle zásad ochrany osobních údajů.`] },
    ],
  },
};

export default function LegalPage({ type }: { type: DocumentType }) {
  const doc = docs[type];
  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <div className={styles.topInner}>
          <Link href="/" className={styles.brand}>SPRINTUY<span style={{color: "#f97359"}}>.</span></Link>
          <Link href="/" className={styles.home}>Zpět na úvod</Link>
        </div>
      </header>
      <main className={styles.article}>
        <span className={styles.eyebrow}>SPRINTUY / INFORMACE</span>
        <h1>{doc.title}</h1>
        <p className={styles.lead}>{doc.intro}</p>
        <p className={styles.updated}>Aktualizováno: 4. listopadu 2026</p>
        {doc.sections.map((section, index) => (
          <section key={section.title} className={styles.section} aria-labelledby={`section-${index}`}>
            <h2 id={`section-${index}`}>{section.title}</h2>
            {section.paragraphs?.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
            {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
          </section>
        ))}
        {type === "deletion" && <section className={styles.section}>
          <h2>Požádat o smazání</h2>
          <p><a href="mailto:sprintuy@lokinstudio.com?subject=Smaz%C3%A1n%C3%AD%20%C3%BA%C4%8Dtu%20Sprintuy">Odeslat žádost e-mailem</a></p>
        </section>}
        {type === "privacy" && <p className={styles.note}>Informace o smazání účtu: <Link href="/delete-account">Smazání účtu a dat</Link>.</p>}
      </main>
      <PublicFooter />
    </div>
  );
}
