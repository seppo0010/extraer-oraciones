import React, { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import Dropzone from "react-dropzone";
import { useAsync } from "react-use";
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.js";

interface Result {
  page: number;
  sentence: string;
  term: string;
}

const zip = <T extends unknown>(a: T[], b: T[]): [T, T][] =>
  Array.from(Array(Math.min(b.length, a.length)), (_, i) => [a[i], b[i]]);
const range = (length: number) => Array.from({ length }, (x, i) => i);

function App() {
  const [palabras, setPalabras] = useState("fuerza\nenergía\nintencionar");
  const [files, setFiles] = useState<File[]>([]);
  const [buscar, setBuscar] = useState(false);
  const [numSentences, setNumSentences] = useState<number | null>(null);
  const resultados = useAsync(async () => {
    if (!buscar) return;
    return (
      await Promise.all(
        files.flatMap(
          async (f): Promise<Result[]> => {
            const pdf = await pdfjsLib.getDocument(
              new Uint8Array(await f.arrayBuffer())
            ).promise;

            let sentences = 0;
            const res = await Promise.all(
              range(pdf.numPages).flatMap(
                async (pageNumber): Promise<Result[]> => {
                  const page = await pdf.getPage(pageNumber + 1);
                  const texts = await page.getTextContent();
                  const pageText = texts.items
                    .map((item) => (item as { str?: string }).str ?? "")
                    .join(" ");
                  sentences += (pageText.match(/\w[.?!](\s|$)/g) ?? []).length
                  return palabras
                    .toLocaleLowerCase()
                    .split("\n")
                    .flatMap((palabra): Result[] => {
                      const p = palabra.trim();
                      if (p === "") return [];
                      const blocks = pageText.split(new RegExp(p, "ig"));
                      return zip(blocks, blocks.slice(1)).map(
                        ([before, after]): Result => {
                          const b = `.${before}`;
                          const a = `${after}.`;
                          return {
                            page: pageNumber + 1,
                            sentence:
                              b.substring(b.lastIndexOf(".") + 1) +
                              "" +
                              palabra +
                              "" +
                              a.substring(0, a.indexOf(".") + 1),
                            term: palabra,
                          };
                        }
                      );
                    });
                }
              )
            );
            setNumSentences(sentences);
            return res.flat();
          }
        )
      )
    ).flat();
  }, [buscar, files, palabras]);
  return (
    <div>
      {!buscar && (
        <div>
          Meté palabras acá, una por línea
          <textarea
            style={{ width: "100%" }}
            rows={10}
            onChange={(ev) => setPalabras(ev.target.value)}
            value={palabras}
          />
          <Dropzone onDrop={(acceptedFiles) => setFiles(acceptedFiles)}>
            {({ getRootProps, getInputProps }) => (
              <section style={{ border: "3px dashed #333", borderRadius: 5 }}>
                <div {...getRootProps()}>
                  <input {...getInputProps()} />
                  <p>
                    {files.length === 0
                      ? `Tirá archivos acá`
                      : `${files.map((f) => f.name).join(", ")}`}
                  </p>
                </div>
              </section>
            )}
          </Dropzone>
          <button onClick={() => setBuscar(true)} style={{ padding: 6 }}>
            Buscar
          </button>
        </div>
      )}
      {buscar && (
        <div>
          {resultados.loading && "Buscando..."}
          {resultados.error && <p>{`Error: ${resultados.error}`}</p>}
          {!resultados.loading && !resultados.error && (
            <>
              {!resultados.value && <p>No se encontraron resultados.</p>}
              {resultados.value && (<>
                {numSentences && <p>Cantidad de oraciones: {numSentences}</p>}
                <ul>
                  {resultados.value.map((v, i) => (
                    <li key={`${i}`}>
                      <p>
                        Página: {v.page}
                        <br />
                        {v.sentence}
                      </p>
                    </li>
                  ))}
                </ul>
              </>)}
            </>
          )}
          <button onClick={() => setBuscar(false)} style={{ padding: 6 }}>
            Volver
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
