import { createRequire } from 'module'
import { writeFileSync } from 'fs'

const require = createRequire(import.meta.url)
const JSZip = require('../node_modules/jszip/lib/index.js')

const songs = [
  {
    title: 'Santo, Santo, Santo',
    sections: [
      { label: '[Verso 1]', lines: [
        { chord: 'G           D        Em         C', lyric: 'Santo, santo, santo, el Señor omnipotente' },
        { chord: 'G              D      G', lyric: 'Quien fue, quien es, y que ha de venir' },
        { chord: 'G             D         Em         C', lyric: 'Santo, santo, santo, el Señor omnipotente' },
        { chord: 'D                 G', lyric: 'Digno eres tú Señor de alabar' },
      ]},
      { label: '[Coro]', lines: [
        { chord: 'C          G         Am        Em', lyric: 'Santo es el Señor Dios todopoderoso' },
        { chord: 'F              C         G', lyric: 'Quien era, quien es, y que ha de venir' },
        { chord: 'C          G         Am        Em', lyric: 'Santo es el Señor Dios todopoderoso' },
        { chord: 'F         G         C', lyric: 'Gloria al Rey de los reyes Amen' },
      ]},
    ]
  },
  {
    title: 'Cuán Grande Es Él',
    sections: [
      { label: '[Verso 1]', lines: [
        { chord: 'G                     C       G', lyric: 'Señor mi Dios, al contemplar los cielos' },
        { chord: '             D        G', lyric: 'El firmamento, el bosque y el altar' },
        { chord: 'G                C         G', lyric: 'Al oír tu voz en los truenos y el viento' },
        { chord: '       D              G', lyric: 'Y ver brillar el sol en su esplendor' },
      ]},
      { label: '[Coro]', lines: [
        { chord: 'G           C        G', lyric: 'Entonces mi alma entona la canción' },
        { chord: '          D7       G', lyric: 'Cuán grande es Él, cuán grande es Él' },
        { chord: 'G           C        G', lyric: 'Entonces mi alma entona la canción' },
        { chord: '          D7       G', lyric: 'Cuán grande es Él, cuán grande es Él' },
      ]},
    ]
  },
  {
    title: 'Renuévame',
    sections: [
      { label: '[Verso 1]', lines: [
        { chord: 'Am          Em        F       C', lyric: 'Renuévame, renuévame, Señor Jesús, renuévame' },
        { chord: 'Am          Em        F       E', lyric: 'No quiero ser igual que ayer' },
        { chord: 'Am          Em        F       C', lyric: 'Renuévame, renuévame, Señor Jesús, renuévame' },
        { chord: 'Am       E          Am', lyric: 'Lléname de tu Santo Espíritu' },
      ]},
      { label: '[Coro]', lines: [
        { chord: 'F       C      G       Am', lyric: 'Porque necesito más de ti' },
        { chord: 'F       C      G       Am', lyric: 'Porque necesito más de ti' },
        { chord: 'F       C      G       Am', lyric: 'Necesito más, oh Señor, más de ti' },
        { chord: 'F       G      Am', lyric: 'Que todo lo que soy a ti lo consagro' },
      ]},
    ]
  },
  {
    title: 'Glorioso',
    sections: [
      { label: '[Verso 1]', lines: [
        { chord: 'D              A         Bm        G', lyric: 'Al contemplar la cruz donde murió mi Señor' },
        { chord: 'D              A         G         D', lyric: 'Las riquezas del mundo yo las pierdo al ver' },
        { chord: 'D              A         Bm        G', lyric: 'Mi orgullo y mi gloria entrego al pie de la cruz' },
        { chord: 'D         A       G         D', lyric: 'Lo más precioso es el amor de Dios' },
      ]},
      { label: '[Coro]', lines: [
        { chord: 'G           D          A', lyric: 'Oh glorioso día cuando vi la cruz' },
        { chord: 'Bm           G         D         A', lyric: 'El amor de Dios que a mí me transformó' },
        { chord: 'G           D          A', lyric: 'Muerto para el mundo y vivo para Él' },
        { chord: 'Bm        G       D      A    D', lyric: 'En la cruz de Cristo todo lo perdí y lo gané' },
      ]},
    ]
  },
  {
    title: 'Tu Fidelidad',
    sections: [
      { label: '[Verso 1]', lines: [
        { chord: 'C          G      Am        F', lyric: 'Grande es tu fidelidad, oh Dios mi Padre' },
        { chord: 'C          G           F    C', lyric: 'No hay sombra de variación en ti' },
        { chord: 'C          G        Am       F', lyric: 'Al cambiar la creación, tu compasión declina' },
        { chord: 'C            G          C', lyric: 'Grande es tu fidelidad Señor' },
      ]},
      { label: '[Coro]', lines: [
        { chord: 'F       C        G      C', lyric: 'Grande es tu fidelidad, grande es tu fidelidad' },
        { chord: 'F         C       G       Am', lyric: 'Cada mañana se renuevan tus bondades' },
        { chord: 'F       C        G      C', lyric: 'Grande es tu fidelidad, grande es tu fidelidad' },
        { chord: 'F         G       C', lyric: 'Todo lo que necesito en ti lo tengo Señor' },
      ]},
    ]
  },
  {
    title: 'Dios de Pacto',
    sections: [
      { label: '[Verso 1]', lines: [
        { chord: 'Em           C      G           D', lyric: 'No me falla Dios, no me falla Dios' },
        { chord: 'Em        C            D', lyric: 'Siempre cuida Él de mí' },
        { chord: 'Em           C       G           D', lyric: 'Su amor no cambia aunque yo cambie a Él' },
        { chord: 'Em        C          D    Em', lyric: 'Grande es su fidelidad en mí' },
      ]},
      { label: '[Coro]', lines: [
        { chord: 'G       D       Em        C', lyric: 'Dios de pacto, eterno en tu amor' },
        { chord: 'G       D          C', lyric: 'Tu promesa no falla jamás' },
        { chord: 'G       D       Em        C', lyric: 'En la prueba y en el dolor' },
        { chord: 'G          D        C       G', lyric: 'Tu palabra me sostiene hasta el final' },
      ]},
    ]
  },
  {
    title: 'Jesús Es El Rey',
    sections: [
      { label: '[Verso 1]', lines: [
        { chord: 'A          E         F#m       D', lyric: 'Jesús es el Rey, Jesús es el Señor' },
        { chord: 'A          E              D', lyric: 'Digno de toda la gloria y honor' },
        { chord: 'A          E         F#m       D', lyric: 'Venimos a adorar, venimos a servir' },
        { chord: 'A             E         D    A', lyric: 'Al Rey de reyes y Señor de señores' },
      ]},
      { label: '[Coro]', lines: [
        { chord: 'D          A       E         F#m', lyric: 'Aleluya, aleluya, al Cordero de Dios' },
        { chord: 'D       A       E         D', lyric: 'Que quita el pecado del mundo aleluya' },
        { chord: 'D          A       E         F#m', lyric: 'Aleluya, aleluya, gloria sea a su nombre' },
        { chord: 'D       E         A', lyric: 'Por siempre y para siempre amén' },
      ]},
    ]
  },
  {
    title: 'En El Monte Calvario',
    sections: [
      { label: '[Verso 1]', lines: [
        { chord: 'G           C        G', lyric: 'En el monte Calvario había una cruz' },
        { chord: '      D7                 G', lyric: 'Emblema de afrenta y dolor' },
        { chord: 'G          C          G', lyric: 'Y yo amo esa cruz do murió mi Jesús' },
        { chord: '      D7              G', lyric: 'Por salvar al más vil pecador' },
      ]},
      { label: '[Coro]', lines: [
        { chord: 'G              D7       G', lyric: 'Oh yo siempre amaré esa cruz' },
        { chord: 'C          G         D7', lyric: 'En sus triunfos mi gloria será' },
        { chord: 'G         C           G', lyric: 'Y algún día en vez de una cruz' },
        { chord: '     D7              G', lyric: 'Mi corona Jesús me dará' },
      ]},
    ]
  },
  {
    title: 'Sublime Gracia',
    sections: [
      { label: '[Verso 1]', lines: [
        { chord: 'G           G7    C       G', lyric: 'Sublime gracia del Señor que a un infeliz salvó' },
        { chord: '    Em       G       D     D7', lyric: 'Fui ciego mas hoy veo yo, perdido y Él me halló' },
      ]},
      { label: '[Verso 2]', lines: [
        { chord: 'G            G7   C          G', lyric: 'Su gracia me enseñó a temer mis dudas ahuyentó' },
        { chord: '    Em           G        D     G', lyric: 'Oh cuán precioso fue a mi ser la hora en que creyó' },
      ]},
      { label: '[Verso 3]', lines: [
        { chord: 'G            G7      C        G', lyric: 'Y cuando en Sión por siglos mil brillando esté cual sol' },
        { chord: '     Em           G      D7    G', lyric: 'Yo cantaré por siempre allí su amor que me salvó' },
      ]},
    ]
  },
  {
    title: 'Soy Salvo',
    sections: [
      { label: '[Verso 1]', lines: [
        { chord: 'C             F          C', lyric: 'Soy salvo, soy salvo, lo sé' },
        { chord: '        G                C', lyric: 'La sangre me ha purificado' },
        { chord: 'C             F          C', lyric: 'Soy salvo, soy salvo, lo sé' },
        { chord: '        G          C', lyric: 'Jesús me ha perdonado' },
      ]},
      { label: '[Coro]', lines: [
        { chord: 'F       C         G       C', lyric: 'Aleluya, soy salvo por gracia del Señor' },
        { chord: 'F          C       G       C', lyric: 'Su amor me alcanzó cuando yo pecador era' },
        { chord: 'F       C         Am      F', lyric: 'Aleluya, soy salvo, redimido estoy' },
        { chord: 'G                C', lyric: 'Y vivo para glorificarle a Él' },
      ]},
    ]
  },
  {
    title: 'Poderoso Para Salvar',
    sections: [
      { label: '[Verso 1]', lines: [
        { chord: 'G              D          Em         C', lyric: 'Todo aquel que en Él confía no será avergonzado' },
        { chord: 'G              D              C', lyric: 'Él es poderoso, poderoso para salvar' },
        { chord: 'G              D          Em         C', lyric: 'Por su sangre fuiste comprado, por su amor eres librado' },
        { chord: 'G              D              C    G', lyric: 'Él es poderoso, poderoso para salvar' },
      ]},
      { label: '[Coro]', lines: [
        { chord: 'C        G       D        Em', lyric: 'Salvador, Salvador, poderoso Salvador' },
        { chord: 'C        G          D', lyric: 'Digno es el Cordero que fue inmolado' },
        { chord: 'C        G       D        Em', lyric: 'Salvador, Salvador, eterno Salvador' },
        { chord: 'C            G      D       G', lyric: 'A Él sea la gloria por los siglos amén' },
      ]},
    ]
  },
  {
    title: 'Ven Espíritu',
    sections: [
      { label: '[Verso 1]', lines: [
        { chord: 'Am         Em       F          C', lyric: 'Ven Espíritu de Dios, llena este lugar' },
        { chord: 'Am         Em       F       E', lyric: 'Mueve con tu poder, ven a transformar' },
        { chord: 'Am         Em       F          C', lyric: 'Toca cada corazón, sana el que está roto' },
        { chord: 'Am     E          Am', lyric: 'Ven Señor, aquí estoy' },
      ]},
      { label: '[Coro]', lines: [
        { chord: 'F       C          G       Am', lyric: 'Fuego de Dios, desciende sobre mí' },
        { chord: 'F       C          G       Am', lyric: 'Lléname hasta rebosar' },
        { chord: 'F       C       G         Am', lyric: 'Tu presencia es lo que anhelo Señor' },
        { chord: 'F          G       Am', lyric: 'Sin ti yo nada soy, solo en ti' },
      ]},
    ]
  },
  {
    title: 'Digno Es El Cordero',
    sections: [
      { label: '[Verso 1]', lines: [
        { chord: 'D              G        A         D', lyric: 'Digno es el Cordero que fue muerto en la cruz' },
        { chord: 'D              G        A         D', lyric: 'Digno es el Cordero que resucitó' },
        { chord: 'G              D        A         Bm', lyric: 'A Él sea la gloria, el poder y la honra' },
        { chord: 'G           A          D', lyric: 'Por los siglos de los siglos amén' },
      ]},
      { label: '[Coro]', lines: [
        { chord: 'G       D       A        Bm', lyric: 'Santo, santo, Dios omnipotente' },
        { chord: 'G       D          A', lyric: 'El que era, el que es y el que ha de venir' },
        { chord: 'G       D       A        Bm', lyric: 'Gloria, gloria, a ti sea la gloria' },
        { chord: 'G       A       D', lyric: 'Por siempre y para siempre amén' },
      ]},
    ]
  },
  {
    title: 'Oh Señor Cuán Bueno Eres',
    sections: [
      { label: '[Verso 1]', lines: [
        { chord: 'C          F        C       G', lyric: 'Oh Señor cuán bueno eres tu conmigo' },
        { chord: 'C          F        G       C', lyric: 'Tu bondad jamás se acaba, es eterna tu bondad' },
        { chord: 'Am         F        C       G', lyric: 'Como padre tierno y manso me sostienes con tu mano' },
        { chord: 'F          G        C', lyric: 'Y me llevas a tu hogar' },
      ]},
      { label: '[Coro]', lines: [
        { chord: 'F       C       G       Am', lyric: 'Te alabo mi Señor, te glorifico' },
        { chord: 'F       C           G', lyric: 'Porque eres bueno y tu amor es eterno' },
        { chord: 'F       C       G       Am', lyric: 'Te alabo mi Señor, te glorifico' },
        { chord: 'F          G       C', lyric: 'Para siempre cantaré de tu amor' },
      ]},
    ]
  },
  {
    title: 'Bienvenido Espíritu Santo',
    sections: [
      { label: '[Verso 1]', lines: [
        { chord: 'G           D         Em         C', lyric: 'Bienvenido Espíritu Santo, tu presencia anhelo' },
        { chord: 'G           D              C      G', lyric: 'Ven y llena este lugar con tu gloria y tu poder' },
        { chord: 'G           D         Em         C', lyric: 'Sin tu soplo no hay vida, sin tu luz hay oscuridad' },
        { chord: 'G           D         C          G', lyric: 'Ven Espíritu de Dios, mueve aquí' },
      ]},
      { label: '[Coro]', lines: [
        { chord: 'C          G         D          Em', lyric: 'Sopla viento de Dios sobre este lugar' },
        { chord: 'C          G            D', lyric: 'Que tu fuego consuma todo lo que no es de ti' },
        { chord: 'C          G         D          Em', lyric: 'Ven y restaura, sana y transforma' },
        { chord: 'C          D          G', lyric: 'Tu presencia es todo lo que necesito' },
      ]},
    ]
  },
]

function esc(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function para(text, style) {
  if (style) {
    return `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>\n`
  }
  return `<w:p><w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>\n`
}

async function main() {
  const zip = new JSZip()

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`)

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`)

  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`)

  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr><w:outlineLvl w:val="0"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Normal" w:default="1">
    <w:name w:val="Normal"/>
  </w:style>
</w:styles>`)

  let body = ''
  for (const song of songs) {
    body += para(song.title, 'Heading1')
    for (const section of song.sections) {
      body += para(section.label)
      for (const line of section.lines) {
        body += para(line.chord)
        body += para(line.lyric)
      }
      body += para('')
    }
    body += para('')
  }

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
${body}    <w:sectPr/>
  </w:body>
</w:document>`)

  const buf = await zip.generateAsync({ type: 'nodebuffer' })
  const outPath = 'C:/Users/nahue/Downloads/Cancionero con acordes - 14032020.docx'
  writeFileSync(outPath, buf)
  console.log(`Created: ${outPath}`)
  console.log(`Size: ${buf.length} bytes | Songs: ${songs.length}`)
}

main().catch(console.error)
