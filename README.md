# CSV Insights

IMPORTANTE: CARGA DEL CSV DEL USUARIO

La aplicación debe trabajar principalmente con el archivo CSV que el usuario suba manualmente.

No asumir que los datos financieros ya existen dentro de la aplicación.

Flujo obligatorio

En la pantalla "Datos financieros", colocar una zona visible para cargar el archivo:

"Sube tu archivo CSV para comenzar el análisis"

Debe incluir:

Botón "Seleccionar archivo CSV".

Área de arrastrar y soltar (Drag & Drop).

Aceptar únicamente archivos .csv.

Mostrar el nombre del archivo seleccionado.

Mostrar el tamaño del archivo.

Mostrar un indicador de carga mientras se procesa.

Botón "Procesar CSV".

El usuario debe poder seleccionar su propio archivo CSV desde su computadora.

Después de subir el CSV

Una vez cargado el archivo, la aplicación debe:

Leer el CSV.

Detectar automáticamente sus columnas.

Mostrar una vista previa de los primeros registros.

Mostrar el número total de filas.

Mostrar el número total de columnas.

Identificar valores nulos.

Identificar valores duplicados.

Detectar columnas numéricas.

Detectar columnas de fecha.

Mostrar estadísticas descriptivas.

Por ejemplo:

Archivo: datos_financieros.csv

Registros: 5,000
Columnas: 6

Columnas detectadas:
Date
Open
High
Low
Close
Volume

Validación del CSV

La aplicación debe verificar que el archivo sea compatible con el análisis financiero.

Si el CSV contiene las columnas:

Date
Open
High
Low
Close
Volume

utilizarlas automáticamente.

Si los nombres de las columnas son diferentes, permitir al usuario seleccionar qué columna corresponde a:

Fecha.

Precio de apertura.

Precio máximo.

Precio mínimo.

Precio de cierre.

Volumen.

No eliminar silenciosamente columnas desconocidas.

Si faltan columnas necesarias, mostrar un mensaje indicando exactamente qué información falta.

Procesamiento

Después de cargar el CSV, mostrar un botón:

"Procesar y analizar datos"

Al presionarlo:

CSV del usuario
       ↓
Lectura
       ↓
Validación
       ↓
Limpieza
       ↓
Conversión de tipos
       ↓
Tratamiento de valores nulos
       ↓
Ordenamiento por fecha
       ↓
Cálculo de variación
       ↓
Creación de tendencia
       ↓
Datos preparados para Machine Learning

Crear automáticamente una columna:

Tendencia

con:

1 = subida del precio
0 = bajada del precio

Mantener los datos del usuario

Una vez procesado el CSV, utilizar los datos reales cargados por el usuario para:

Gráficos.

Análisis estadístico.

Machine Learning.

PyTorch.

NLP cuando corresponda.

TensorFlow/Keras.

Predicciones.

Comparación de modelos.

No reemplazar el CSV del usuario con datos ficticios.

Datos de demostración

Se puede incluir un botón secundario:

"Usar datos de demostración"

pero debe quedar claramente separado de la opción principal.

Los datos de demostración solo deben utilizarse cuando el usuario decida expresamente probar la aplicación sin subir un archivo.

La opción principal y recomendada siempre debe ser:

"Sube tu archivo CSV".

Mensaje inicial

En el dashboard, si todavía no existe ningún CSV cargado, mostrar:

No hay datos cargados

Sube tu archivo CSV para comenzar el análisis financiero y utilizar los modelos de Machine Learning y Deep Learning.

Incluir un botón:

"Subir CSV"

que lleve directamente a la sección de carga de datos.

Importante para la implementación

La aplicación debe estar preparada para procesar archivos CSV reales de diferentes tamaños, no solamente un conjunto de datos escrito manualmente en el código.

El sistema debe conservar el dataset cargado durante la sesión para que todos los módulos trabajen sobre el mismo conjunto de datos.

Los modelos de Machine Learning y Deep Learning deben utilizar los datos procesados del CSV que el usuario haya cargado.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a7ffdf4c-dd26-4856-a908-5f566cc255c0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
