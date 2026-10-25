# Llamada con Papá Noel

Web app gratis para que una nena o un nene de 2 años tenga una videollamada con Papá Noel desde el celular.
Todo corre en el teléfono: no hay servidor, ni cuentas, ni costos por uso.

## Cómo funciona

- **Cara**: una foto fotorrealista de Papá Noel animada en WebGL (parpadeo, mirada, respiración, movimientos de cabeza, sonrisa y boca). Los puntos de la cara se midieron con MediaPipe Face Landmarker.
- **Labios**: la boca se mueve según el propio audio. Para cada frase se calcula, cuadro a cuadro, el volumen y el timbre, y con eso cuánto se abre la boca y si va redonda (o, u) o estirada (e, i).
- **Voz**: Kokoro-82M con la voz `em_santa` en español. Las frases generales vienen pregrabadas en `voz/`. Las que llevan el nombre, la mascota o la familia las genera el teléfono una sola vez, cuando mamá o papá cargan los datos. Si no puede, usa la voz del sistema.
- **Cerebro**: un guion pensado para chiquitos de 2 años (saludos, animales y sus sonidos, colores, renos, canciones, preguntas fáciles). Nunca promete regalos que los papás no aprobaron, nunca pide secretos ni datos, y si la nena está triste o se lastimó la manda con mamá o papá. Hay una opción beta con IA local (Gemma 3 1B vía WebLLM) que pasa por filtros de seguridad.
- **Oído**: el reconocimiento de voz del navegador (es-AR). Si no la entiende, los papás tienen botones y un campo de texto durante la llamada.
- **Memoria**: en el teléfono (localStorage). Papá Noel recuerda la mascota, lo que le gusta y de qué charlaron la última vez.

## Uso

1. Abrir la página en el celular.
2. Tocar el engranaje, crear un PIN y completar los datos de la nena. Tocar **Guardar** con wifi: se descarga la voz (unos 90 MB, una sola vez) y se preparan las frases con su nombre.
3. Agregar a la pantalla de inicio desde el menú del navegador.
4. Tocar el botón verde.

## Créditos

- Voz: [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) (Apache 2.0) vía [kokoro-js](https://www.npmjs.com/package/kokoro-js).
- IA opcional: [WebLLM](https://github.com/mlc-ai/web-llm) (Apache 2.0) con Gemma 3 1B ([términos de Gemma](https://ai.google.dev/gemma/terms)).
- Imagen de Papá Noel generada con Gemini.
