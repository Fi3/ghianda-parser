import React, {useState} from 'react';
import logo from './logoGhianda.png';
import { ThemeProvider } from 'emotion-theming'
import theme from '@rebass/preset'
import {Text, Flex, Box, Image, Button} from 'rebass'
import { Input } from '@rebass/forms'
//import parser from './xml2json'
import parser from 'fast-xml-parser'
import he from 'he'
import XLSX from 'xlsx'

var options = {
    attributeNamePrefix : "@_",
    attrNodeName: "attr", //default is 'false'
    textNodeName : "#text",
    ignoreAttributes : true,
    ignoreNameSpace : false,
    allowBooleanAttributes : false,
    parseNodeValue : true,
    parseAttributeValue : false,
    trimValues: true,
    cdataTagName: "__cdata", //default is 'false'
    cdataPositionChar: "\\c",
    parseTrueNumberOnly: false,
    arrayMode: false, //"strict"
    attrValueProcessor: (val, attrName) => he.decode(val, {isAttributeValue: true}),//default is a=>a
    tagValueProcessor : (val, tagName) => he.decode(val), //default is a=>a
    stopNodes: ["parse-me-as-string"]
};

function convertToCSV(array) {
  //var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
  var str = '';

  for (var i = 0; i < array.length; i++) {
    var line = '';
    for (var index in array[i]) {
      if (line !== '') line += ','

      line += array[i][index];
    }

    str += line + '\r\n';
  }

  return str;
}

function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

const file2text = async file =>
  await file.text()

// Extract an object as the lineTemplate
// For each line in the fattura body
const parseXmlProductsDetails = (data) => {
  const lineTemplate = {
    NumeroLinea: ''
    , Fornitore: ''
    , FornitoreCodice: ''
    , DataFattura: ''
    , NumeroFattura: ''
    //, CodiceArticolo: ''
    , CodiceArticoloTipo: ''
    , CodiceArticoloValore: ''
    //, CodiceArticolo: ''
    , Descrizione: ''
    , Quantita: ''
    , PrezzoUnitario: ''
    , PrezzoTotale: ''
    , AliquotaIVA: ''
    , UnitaMisura: ''
    //, ScontoMaggiorazione: ''
    , ScontoMaggiorazioneTipo: ''
    , ScontoMaggiorazionePercentuale: ''
    , ScontoMaggiorazioneImporto: ''
    //, ScontoMaggiorazione: ''
    , TipoCessionePrestazione: ''
    , DataInizioPeriodo: ''
    , DataFinePeriodo: ''
    , Ritenuta: ''
    , Natura: ''
    , RiferimentoAmministrazione: ''
    //, AltriDatiGestionali: ''
    , AltriDatiGestionaliTipo: ''
    , AltriDatiGestionaliTesto: ''
    , AltriDatiGestionaliNumero: ''
    , AltriDatiGestionaliData: ''
  }

  const parsed = parser.parse(data,options)
  const version = Object.keys(parsed)
  const fattura = parsed[version]
  const ImportoTotale =
    fattura.FatturaElettronicaBody.DatiGenerali.DatiGeneraliDocumento.ImportoTotaleDocumento || ''
  const DataFattura =
    fattura.FatturaElettronicaBody.DatiGenerali.DatiGeneraliDocumento.Data || ''
  const NumeroFattura =
    fattura.FatturaElettronicaBody.DatiGenerali.DatiGeneraliDocumento.Numero || ''
  const Fornitore =
    fattura.FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici.Anagrafica.Denominazione || ''
  const FornitoreCodice =
    fattura.FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici.IdFiscaleIVA.IdCodice || ''
  let lines = fattura.FatturaElettronicaBody.DatiBeniServizi.DettaglioLinee
  if (! Array.isArray(lines)) {
    lines = [lines]
  }
  const parsedLines = []
  for (const line of lines) {
    const CodiceArticolo = line.CodiceArticolo || {CodiceTipo: '', CodiceValore: ''}
    const CodiceArticoloTipo = CodiceArticolo.CodiceTipo
    const CodiceArticoloValore = CodiceArticolo.CodiceValore

    const ScontoMaggiorazione = line.ScontoMaggiorazione || {Tipo: '', Percentuale: '', Importo: ''}
    const ScontoMaggiorazioneTipo = ScontoMaggiorazione.Tipo
    const ScontoMaggiorazionePercentuale = ScontoMaggiorazione.Percentuale
    const ScontoMaggiorazioneImporto = ScontoMaggiorazione.Importo

    const AltriDatiGestionali = line.AltriDatiGestionali || 
      {TipoDato: '', RiferimentoTesto: '', RiferimentoNumero: '', RiferimentoData: ''}
    const AltriDatiGestionaliTipo = AltriDatiGestionali.TipoDato
    const AltriDatiGestionaliTesto = AltriDatiGestionali.RiferimentoTesto
    const AltriDatiGestionaliNumero = AltriDatiGestionali.RiferimentoNumero
    const AltriDatiGestionaliData = AltriDatiGestionali.RiferimentoData
    delete line.CodiceArticolo
    delete line.ScontoMaggiorazione
    delete line.AltriDatiGestionali

    const customFields = {
      CodiceArticoloTipo
      , CodiceArticoloValore
      , ScontoMaggiorazioneTipo
      , ScontoMaggiorazionePercentuale
      , ScontoMaggiorazioneImporto
      , AltriDatiGestionaliTipo
      , AltriDatiGestionaliTesto
      , AltriDatiGestionaliNumero
      , AltriDatiGestionaliData
      , Fornitore
      , FornitoreCodice
      , ImportoTotale
      , DataFattura
      , NumeroFattura
    }

    parsedLines.push({...lineTemplate, ...line, ...customFields})
    //if (parseFloat(lineTemplate.PrezzoTotale > 0)) {
    //  parsedLines.push({...lineTemplate, ...line, ...customFields})
    //}
  }
  return parsedLines
}

const parseFile = async file => {
  const text = await file2text(file)
  const parsedLines = parseXmlProductsDetails(text)
  if (parsedLines[0] !== undefined) {
    const csvHeader = Object.keys(parsedLines[0]).toString()
    const csvBody = convertToCSV(parsedLines)
    return [csvBody, csvHeader]
  }
  throw new Error('')
}

const parseFileExcell = async file => {
  const text = await file2text(file)
  const parsedLines = parseXmlProductsDetails(text)
  if (parsedLines[0] !== undefined) {
    return parsedLines
  }
  throw new Error('')
}

const parseFiles = async files => {
  const parsedFiles = []
  for (const file of files) {
    let body
    let header
    try {
      [body, header] = await parseFile(file)
    } catch(e) {
        alert(`One or more files are not valid xml fatture ${file.name}`)
        continue
    }
    if (parsedFiles.length === 0) {
      parsedFiles.push(header)
    }
    parsedFiles.push(body)
  }
  const csv = parsedFiles.join('')
  download('Fatture.csv', csv)
}

const parseFilesExcell = async files => {
  const parsedFiles = []
  for (const file of files) {
    let parsed
    try {
      parsed = await parseFileExcell(file)
    } catch(e) {
        alert(`One or more files are not valid xml fatture ${file.name}`)
        continue
    }
    parsedFiles.push(parsed)
  }
  const book = XLSX.utils.book_new();
  const parsedLines = parsedFiles.flat()
  const sheet = XLSX.utils.json_to_sheet(parsedLines )
  XLSX.utils.book_append_sheet(book, sheet, 'Fatture')
  XLSX.writeFile(book, 'Fatture.xls')
}

// IT0526289001420154_4RO0B.xml

const Header = () =>
  <Flex
    width='100%'
    height='10%'
    justifyContent='space-between'
    alignItems='center'
    textAlign='center'
    style={{
      borderBottomStyle: 'solid',
      borderBottomWidth: '1px',
      borderBottomColor: 'grey'
    }}
  >
    <Box ml='3%'>
      <Image src={logo} />
    </Box>
    <Box mr='3%'>
      <Text
        color='primary'
        fontWeight='bold'
        fontSize='1.5em'
      >
        Info
      </Text>
    </Box>
  </Flex>

const FileSelector = () => {
  const [files, setFiles] = useState([]);
  return (
    <Flex
      flexDirection='column'
      justifyContent='center'
      alignItems='center'
      textAlign='center'
      height='30%'
    >
      <Input
        type='file'
        multiple
        id='input'
        onInput={() => setFiles(document.getElementById('input').files)}
      />
      <Text mt='5%'> Download as:</Text>
      <Flex mt='3%' justifyContent='space-around' width='50%'>
        <Button 
          disabled={files.length === 0 ? true : false}
          onClick={() => parseFilesExcell(files)}
          variant={files.length === 0 ? 'outline' : 'primary'}
        >
          Excel
        </Button>
        <Button 
          disabled={files.length === 0 ? true : false}
          onClick={() => parseFiles(files)}
          variant={files.length === 0 ? 'outline' : 'primary'}
        >
          CSV
        </Button>
      </Flex>
      <Text mt='5%'>{`${files.length} ${files.length === 1 ? 'file' : 'files'} selected `}</Text>
    </Flex>
  )
}


export default () =>
  <ThemeProvider theme={theme}>
    <Flex
      flexDirection='column'
      justifyContent='space-between'
      alignItems='center'
      textAlign='center'
      width={vh >= vw ? '100%' : '375px'}
      height={vh >= vw ? vh : '667px'}
      mr='auto'
      ml='auto'
      mt={vh >= vw ? 0 : '10%'}
      style={{
        borderStyle: vh >= vw ? '' : 'solid',
        borderWidth: vh >= vw ? 0 : '1px',
        borderEndStartRadius: vh >= vw ? 0 : '20px',
      }}
    >
      <Header />
      <FileSelector />
      <Box height='50%'>
      </Box>
    </Flex>
  </ThemeProvider>
