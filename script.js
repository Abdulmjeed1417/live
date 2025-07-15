// Wait for the Monaco Editor loader to be ready
require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' }});
require(['vs/editor/editor.main'], function() {
    // -----------------
    // EDITOR INITIALIZATION
    // -----------------

    // Initialize Monaco Editor for each language
    // Load content from localStorage if available, otherwise use default content
    const htmlEditor = monaco.editor.create(document.getElementById('html-editor'), {
        value: localStorage.getItem('html') || `<h1>Hello, world!</h1>\n<p>This is a live preview.</p>`,
        language: 'html',
        theme: 'vs-light',
        automaticLayout: true
    });

    const cssEditor = monaco.editor.create(document.getElementById('css-editor'), {
        value: localStorage.getItem('css') || `h1 {\n    color: blue;\n}`,
        language: 'css',
        theme: 'vs-light',
        automaticLayout: true
    });

    const jsEditor = monaco.editor.create(document.getElementById('javascript-editor'), {
        value: localStorage.getItem('javascript') || `console.log("Hello from JavaScript!");`,
        language: 'javascript',
        theme: 'vs-light',
        automaticLayout: true
    });

    const pythonEditor = monaco.editor.create(document.getElementById('python-editor'), {
        value: localStorage.getItem('python') || `print("Hello from Python!")`,
        language: 'python',
        theme: 'vs-light',
        automaticLayout: true
    });

    const editors = {
        html: htmlEditor,
        css: cssEditor,
        javascript: jsEditor,
        python: pythonEditor
    };

    // -----------------
    // PREVIEW UPDATING
    // -----------------

    // Function to update the preview iframe with the HTML, CSS, and JS code
    function updatePreview() {
        const htmlCode = htmlEditor.getValue();
        const cssCode = cssEditor.getValue();
        const jsCode = jsEditor.getValue();

        const preview = document.getElementById('preview');
        const previewDoc = preview.contentDocument || preview.contentWindow.document;

        previewDoc.open();
        previewDoc.write(`
            <html>
                <head>
                    <style>${cssCode}</style>
                </head>
                <body>
                    ${htmlCode}
                    <script>${jsCode}<\/script>
                </body>
            </html>
        `);
        previewDoc.close();
    }

    // Add event listeners to update the preview and save to localStorage on content change
    htmlEditor.onDidChangeModelContent(() => {
        updatePreview();
        localStorage.setItem('html', htmlEditor.getValue());
    });
    cssEditor.onDidChangeModelContent(() => {
        updatePreview();
        localStorage.setItem('css', cssEditor.getValue());
    });
    jsEditor.onDidChangeModelContent(() => {
        updatePreview();
        localStorage.setItem('javascript', jsEditor.getValue());
    });
    pythonEditor.onDidChangeModelContent(() => {
        localStorage.setItem('python', pythonEditor.getValue());
    });

    // Initial preview update
    updatePreview();

    // -----------------
    // PYODIDE INTEGRATION
    // -----------------

    let pyodide;
    // Initialize Pyodide
    async function initPyodide() {
        pyodide = await loadPyodide();
    }
    const pyodidePromise = initPyodide();

    // Function to run Python code and display output in the preview pane
    async function runPython() {
        await pyodidePromise;
        const pythonCode = pythonEditor.getValue();
        try {
            // Redirect stdout to capture print output
            pyodide.runPython(
                `
                import io
                import sys
                sys.stdout = io.StringIO()
                `
            );
            pyodide.runPython(pythonCode);
            const output = pyodide.runPython("sys.stdout.getvalue()");

            const preview = document.getElementById('preview');
            const previewDoc = preview.contentDocument || preview.contentWindow.document;
            previewDoc.open();
            previewDoc.write(`<pre>${output}</pre>`);
            previewDoc.close();
        } catch (err) {
            console.error(err);
            const preview = document.getElementById('preview');
            const previewDoc = preview.contentDocument || preview.contentWindow.document;
            previewDoc.open();
            previewDoc.write(`<pre style="color: red;">${err}</pre>`);
            previewDoc.close();
        }
    }

    document.getElementById('run-python-btn').addEventListener('click', runPython);

    // -----------------
    // CONTROLS
    // -----------------

    // Download functionality
    document.getElementById('download-btn').addEventListener('click', () => {
        const zip = new JSZip();
        zip.file("index.html", htmlEditor.getValue());
        zip.file("style.css", cssEditor.getValue());
        zip.file("script.js", jsEditor.getValue());
        zip.file("script.py", pythonEditor.getValue());

        zip.generateAsync({type:"blob"}).then(function(content) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = "code.zip";
            link.click();
        });
    });

    // Tab switching
    const tabs = document.querySelector('.tabs');
    const editorsContainer = document.querySelector('.editor-container');

    tabs.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const lang = e.target.dataset.lang;

            // Update active button
            tabs.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');

            // Show correct editor and hide others
            for (const editor in editors) {
                const editorEl = document.getElementById(`${editor}-editor`);
                if (editor === lang) {
                    editorEl.style.display = 'block';
                } else {
                    editorEl.style.display = 'none';
                }
            }
        }
    });

    // Theme switcher
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('change', (e) => {
        const theme = e.target.checked ? 'dark' : 'light';
        const newEditorTheme = theme === 'dark' ? 'vs-dark' : 'vs-light';
        document.documentElement.setAttribute('data-theme', theme);
        for (const editor in editors) {
            monaco.editor.setTheme(newEditorTheme);
        }
    });

    // Localization
    const translations = {
        en: {
            "about_us": "About Us",
            "about_program": "About the Program",
            "program_version": "Program Version",
            "run_python": "Run Python",
            "download_zip": "Download ZIP",
            "dark_mode": "Dark Mode",
            "html": "HTML",
            "css": "CSS",
            "javascript": "JavaScript",
            "python": "Python"
        },
        ar: {
            "about_us": "من نحن",
            "about_program": "حول البرنامج",
            "program_version": "إصدار البرنامج",
            "run_python": "تشغيل بايثون",
            "download_zip": "تحميل ZIP",
            "dark_mode": "الوضع الداكن",
            "html": "HTML",
            "css": "CSS",
            "javascript": "JavaScript",
            "python": "بايثون"
        }
    };

    const languageSwitcher = document.getElementById('language-switcher');
    languageSwitcher.addEventListener('change', (e) => {
        const lang = e.target.value;
        updateLanguage(lang);
    });

    function updateLanguage(lang) {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            el.textContent = translations[lang][key];
        });
        document.documentElement.lang = lang;
        if (lang === 'ar') {
            document.documentElement.dir = 'rtl';
        } else {
            document.documentElement.dir = 'ltr';
        }
    }
});
