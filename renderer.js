document.addEventListener('DOMContentLoaded', () => {
    const modQueryInput = document.getElementById('modQuery');
    const searchButton = document.getElementById('searchButton');
    const resultsArea = document.getElementById('resultsArea');
    const resultsTitle = document.getElementById('resultsTitle');
    const statusBar = document.getElementById('statusBar');
    const statusText = document.getElementById('statusText');
    const progressBarContainer = document.getElementById('progressBarContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    const activeLoaderDisplay = document.getElementById('activeLoaderDisplay');
    const activeMcVersionsDisplay = document.getElementById('activeMcVersionsDisplay');

    const versionModal = document.getElementById('versionModal');
    const modalModTitle = document.getElementById('modalModTitle');
    const modalVersionsList = document.getElementById('modalVersionsList');
    const closeVersionModalButton = document.getElementById('closeVersionModalButton');

    const folderSelectionModal = document.getElementById('folderSelectionModal');
    const folderModalTitle = document.getElementById('folderModalTitle');
    const folderModalFilename = document.getElementById('folderModalFilename');
    const profileFolderSelect = document.getElementById('profileFolderSelect');
    const customPathInput = document.getElementById('customPathInput');
    const browseFolderButton = document.getElementById('browseFolderButton');
    const confirmFolderButton = document.getElementById('confirmFolderButton');
    const cancelFolderButton = document.getElementById('cancelFolderButton');
    const closeFolderModalButton = document.getElementById('closeFolderModalButton');

    let currentDownloadInfo = null;
    const MODRINTH_API_BASE = "https://api.modrinth.com/v2";

    const DEFAULT_LOADER = "fabric";
    const DEFAULT_MC_VERSIONS = ["1.19.2", "1.20.1", "1.20.6", "1.21.1", "1.21.3", "1.21.4", "1.21.5"];

    function getSelectedLoader() {
        return DEFAULT_LOADER;
    }

    function getSelectedMcVersions() {
        return DEFAULT_MC_VERSIONS;
    }

    function updateActiveFiltersDisplay() {
        const selectedLoader = getSelectedLoader();
        const selectedMcVersions = getSelectedMcVersions();

        activeLoaderDisplay.textContent = selectedLoader.charAt(0).toUpperCase() + selectedLoader.slice(1);
        
        let versionsText;
        if (selectedMcVersions.length === 0) {
            versionsText = 'N/A';
        } else if (selectedMcVersions.length === 1) {
            versionsText = selectedMcVersions[0];
        } else { 
            versionsText = `${selectedMcVersions[0]}-${selectedMcVersions[selectedMcVersions.length - 1]}`;
        }
        activeMcVersionsDisplay.textContent = versionsText;
        activeMcVersionsDisplay.title = DEFAULT_MC_VERSIONS.join(', '); 
    }
    
    updateActiveFiltersDisplay();

    searchButton.addEventListener('click', performSearch);
    modQueryInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') performSearch();
    });

    async function performSearch() {
        const query = modQueryInput.value.trim();
        const currentLoader = getSelectedLoader();
        const currentMcVersions = getSelectedMcVersions();

        if (!query) {
            showStatus("Proszę wpisać nazwę moda.", 'warning');
            return;
        }
        const statusFilterText = `dla ${currentLoader} i MC (${activeMcVersionsDisplay.textContent})`;
        showStatus(`Wyszukiwanie "${query}" ${statusFilterText}...`, 'info', true);
        resultsArea.innerHTML = '<div class="loader"></div>';
        resultsTitle.style.display = 'block';

        const facets = [["project_type:mod"]];
        if (currentLoader) {
            facets.push([`categories:${currentLoader}`]);
        }
        if (currentMcVersions.length > 0) {
            facets.push(currentMcVersions.map(v => `versions:${v}`));
        }

        try {
            const response = await fetch(`${MODRINTH_API_BASE}/search?query=${encodeURIComponent(query)}&facets=${encodeURIComponent(JSON.stringify(facets))}&limit=20`, {
                headers: { 'User-Agent': 'ElectronPureJSModrinthApp/1.9.1 (ProfileUI-Fix)' } 
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ description: "Nieznany błąd API." }));
                throw new Error(`Błąd API Modrinth: ${response.status} - ${errorData.description || response.statusText}`);
            }
            const data = await response.json();
            displaySearchResultsAsCards(data.hits);
            showStatus(`Znaleziono ${data.hits.length} modów pasujących do kryteriów.`, 'success');
        } catch (error) {
            console.error('Błąd wyszukiwania:', error);
            resultsArea.innerHTML = `<p class="no-results">Wystąpił błąd: ${error.message}</p>`;
            showStatus(`Błąd wyszukiwania: ${error.message}`, 'error');
            window.electronAPI.showErrorMessage({ title: "Błąd Wyszukiwania", content: error.message });
        }
    }

    function displaySearchResultsAsCards(hits) {
        resultsArea.innerHTML = '';
        if (!hits || hits.length === 0) {
            resultsArea.innerHTML = '<p class="no-results">Nie znaleziono modów.</p>';
            return;
        }

        hits.forEach((mod, index) => {
            const modCard = document.createElement('div');
            modCard.className = 'mod-card';
            modCard.style.animationDelay = `${index * 0.05}s`;

            const downloadsFormatted = formatDownloadCount(mod.downloads);
            const modGameVersions = Array.isArray(mod.game_versions) ? mod.game_versions : [];
            const versionsDisplay = modGameVersions.length > 0 ? modGameVersions.join(', ') : 'Brak info o wersjach';
            const categoriesDisplay = Array.isArray(mod.categories) ? mod.categories.map(c => c.replace(/_/g, ' ')).join(', ') : 'Brak kategorii';

            modCard.innerHTML = `
                <div class="mod-card-header">
                    <img src="${mod.icon_url || 'icon.png'}" alt="${mod.title || 'Mod Icon'}" class="mod-icon" onerror="this.onerror=null;this.src='icon.png';">
                    <div class="mod-title-author">
                        <h3>${mod.title || 'Brak tytułu'}</h3>
                        <p>Autor: <strong>${mod.author || 'Nieznany'}</strong></p>
                    </div>
                </div>
                <div class="mod-card-body">
                    <p class="mod-summary">${mod.description || 'Brak opisu.'}</p>
                    <div class="mod-card-info">
                        <p>Pobrania: <strong>${downloadsFormatted}</strong></p>
                        <p>Wersje MC (wszystkie): <strong>${versionsDisplay}</strong></p>
                        <p>Kategorie: ${categoriesDisplay}</p>
                    </div>
                </div>
                <div class="mod-card-actions">
                    <button class="btn btn-primary download-mod-button" data-mod-id="${mod.project_id}" data-mod-slug="${mod.slug}" data-mod-title="${mod.title || 'Mod'}">
                        Pobierz / Wersje
                    </button>
                </div>`;
            resultsArea.appendChild(modCard);
        });

        document.querySelectorAll('.download-mod-button').forEach(button => {
            button.addEventListener('click', handleModVersionSelection);
        });
    }

    function formatDownloadCount(num) {
        if (num == null) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return num.toString();
    }

    async function handleModVersionSelection(event) {
        const modId = event.currentTarget.dataset.modId || event.currentTarget.dataset.modSlug;
        const modTitle = event.currentTarget.dataset.modTitle;
        const currentLoader = getSelectedLoader();
        const currentMcVersions = getSelectedMcVersions();

        if (!modId) {
            window.electronAPI.showErrorMessage({ title: "Błąd", content: "Nie można zidentyfikować moda." });
            return;
        }

        showStatus(`Pobieranie listy wersji dla "${modTitle}"...`, 'info', true);
        modalModTitle.textContent = `Wybierz wersję dla: ${modTitle}`;
        modalVersionsList.innerHTML = '<div class="loader"></div>';
        versionModal.classList.add('active');

        const versionParams = {};
        if (currentLoader) {
            versionParams.loaders = JSON.stringify([currentLoader]);
        }
        if (currentMcVersions.length > 0) {
            versionParams.game_versions = JSON.stringify(currentMcVersions);
        }
        const queryParams = new URLSearchParams(versionParams);
        const initialVersionUrl = `${MODRINTH_API_BASE}/project/${modId}/version?${queryParams.toString()}`;
        const allVersionsUrl = `${MODRINTH_API_BASE}/project/${modId}/version`;

        try {
            let response = await fetch(initialVersionUrl, {
                headers: { 'User-Agent': 'ElectronPureJSModrinthApp/1.9.1' }
            });
            let versionsData = await response.json();

            if (!response.ok || (response.ok && (!versionsData || versionsData.length === 0))) {
                 const filterStatusText = `(${currentLoader}, MC: ${activeMcVersionsDisplay.textContent})`;
                 if (response.ok && (!versionsData || versionsData.length === 0)) {
                     showStatus(`Brak wersji dla "${modTitle}" z filtrami ${filterStatusText}, pobieranie wszystkich...`, 'warning');
                } else if (!response.ok && response.status !== 404) {
                     const errorData = await response.json().catch(() => ({}));
                     console.warn(`Błąd API (wersje z filtrem ${response.status} ${filterStatusText}): ${errorData.description || response.statusText}. Próba pobrania wszystkich wersji.`);
                }
                
                console.log(`Pobieranie wszystkich wersji z: ${allVersionsUrl}`);
                response = await fetch(allVersionsUrl, { headers: { 'User-Agent': 'ElectronPureJSModrinthApp/1.9.1' }});
                versionsData = await response.json();
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`Błąd API (wszystkie wersje ${response.status}): ${errorData.description || response.statusText}`);
                }
            }
            
            if (!versionsData || versionsData.length === 0) {
                modalVersionsList.innerHTML = '<p class="no-results">Nie znaleziono żadnych wersji dla tego moda.</p>';
                showStatus(`Nie znaleziono żadnych wersji dla "${modTitle}".`, 'warning');
                return;
            }

            displayVersionsInModal(versionsData, modTitle);
            showStatus(`Wyświetlono wersje dla "${modTitle}".`, 'success');

        } catch (error) {
            console.error('Błąd pobierania wersji:', error);
            modalVersionsList.innerHTML = `<p class="no-results">Błąd: ${error.message}</p>`;
            showStatus(`Błąd pobierania wersji dla "${modTitle}": ${error.message}`, 'error');
            window.electronAPI.showErrorMessage({ title: "Błąd Pobierania Wersji", content: error.message });
        }
    }

    function displayVersionsInModal(versions, modTitle) {
        modalVersionsList.innerHTML = '';
        if (!Array.isArray(versions)) {
            modalVersionsList.innerHTML = '<p class="no-results">Otrzymano nieprawidłowe dane wersji.</p>';
            return;
        }

        versions.forEach((version, index) => {
            if (!version || !Array.isArray(version.files) || version.files.length === 0) return;
            const primaryFile = version.files.find(f => f.primary) || version.files[0];
            if (!primaryFile || !primaryFile.url || !primaryFile.filename) return;

            const item = document.createElement('div');
            item.className = 'version-item';
            item.style.animationDelay = `${index * 0.03}s`;

            const datePublished = version.date_published ? new Date(version.date_published).toLocaleDateString('pl-PL') : 'Brak daty';
            const fileSizeMB = primaryFile.size ? (primaryFile.size / 1024 / 1024).toFixed(2) : 'N/A';

            item.innerHTML = `
                <div class="version-details">
                    <p class="version-name">${version.name || 'N/A'} (${version.version_number || 'N/A'})</p>
                    <p>MC: ${(Array.isArray(version.game_versions) ? version.game_versions.join(', ') : 'N/A')}</p>
                    <p>Loadery: ${(Array.isArray(version.loaders) ? version.loaders.join(', ') : 'N/A')}</p>
                    <p>Data: ${datePublished} | Rozmiar: ${fileSizeMB} MB</p>
                    <p>Plik: ${primaryFile.filename}</p>
                </div>
                <button class="btn btn-secondary download-version-button"
                        data-file-url="${primaryFile.url}"
                        data-file-name="${primaryFile.filename}"
                        data-mod-title="${modTitle}">
                    Pobierz
                </button>`;
            modalVersionsList.appendChild(item);
        });

        document.querySelectorAll('.download-version-button').forEach(button => {
            button.addEventListener('click', (e) => {
                currentDownloadInfo = {
                    url: e.currentTarget.dataset.fileUrl,
                    filename: e.currentTarget.dataset.fileName,
                    modTitle: e.currentTarget.dataset.modTitle
                };
                versionModal.classList.remove('active');
                openFolderSelectionModal(currentDownloadInfo.filename);
            });
        });
    }

    async function openFolderSelectionModal(filenameToDownload) {
        folderModalFilename.textContent = filenameToDownload;
        customPathInput.value = ''; 
        profileFolderSelect.innerHTML = ''; 

        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "-- Inny / Przeglądaj --";
        profileFolderSelect.appendChild(defaultOption);

        let initialPathToSetInInput = ""; 

        try {
            const profileData = await window.electronAPI.getProfileFolders(); 
            console.log("[RendererJS] Otrzymane profileData z main.js:", profileData);
            
            
            if (profileData && profileData.profileFolders && profileData.profileFolders.length > 0) {
                profileData.profileFolders.forEach(folder => {
                    const option = document.createElement('option');
                    option.value = folder.path; 
                    option.textContent = `Profil: ${folder.name}`; 
                    profileFolderSelect.appendChild(option);
                });
            }
            
            if (profileData && profileData.baseProfilePath) {
                if (!profileData.profileFolders || profileData.profileFolders.length === 0) {
                    initialPathToSetInInput = profileData.baseProfilePath;
                }
            }
            
            if(initialPathToSetInInput) {
                customPathInput.value = initialPathToSetInInput;
                profileFolderSelect.value = "";
            }

        } catch (error) {
            console.warn("Nie udało się pobrać folderów profili (get-profile-folders):", error);
            customPathInput.placeholder = "Wprowadź ścieżkę ręcznie lub przeglądaj";
        }
        
        profileFolderSelect.onchange = () => {
            const selectedValue = profileFolderSelect.value;
            if (selectedValue) { 
                customPathInput.value = selectedValue;
            } else {
                customPathInput.value = ""; 
            }
        };
        folderSelectionModal.classList.add('active');
    }

    browseFolderButton.addEventListener('click', async () => {
        try {
            const selectedPath = await window.electronAPI.browseForDirectory();
            if (selectedPath) {
                customPathInput.value = selectedPath;
                profileFolderSelect.value = ""; 
            }
        } catch(error) {
            console.error("Błąd podczas przeglądania folderów:", error);
            window.electronAPI.showErrorMessage({ title: "Błąd Przeglądania", content: "Nie udało się otworzyć okna wyboru folderu." });
        }
    });

    confirmFolderButton.addEventListener('click', () => {
        const selectedDirectory = customPathInput.value.trim(); 
        if (!selectedDirectory) {
            window.electronAPI.showErrorMessage({ title: "Brak folderu", content: "Proszę wybrać lub wprowadzić folder docelowy." });
            return;
        }
        if (!currentDownloadInfo) {
            window.electronAPI.showErrorMessage({ title: "Błąd", content: "Brak informacji o pliku do pobrania." });
            folderSelectionModal.classList.remove('active');
            return;
        }

        folderSelectionModal.classList.remove('active');
        showStatus(`Pobieranie "${currentDownloadInfo.filename}" do "${selectedDirectory}"...`, 'info');
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
        progressBarContainer.style.display = 'flex';
        
        window.electronAPI.downloadFile({
            url: currentDownloadInfo.url,
            directoryPath: selectedDirectory,
            filename: currentDownloadInfo.filename
        }).catch(error => { 
            console.error("Błąd inicjacji pobierania z downloadFile:", error);
            showStatus(`Błąd inicjacji pobierania: ${error.message || error}`, 'error');
            progressBarContainer.style.display = 'none';
            window.electronAPI.showErrorMessage({ title: "Błąd Pobierania", content: `Nie udało się rozpocząć pobierania pliku "${currentDownloadInfo.filename}".\nBłąd: ${error.message || error}`});
        });
        currentDownloadInfo = null;
    });

    cancelFolderButton.addEventListener('click', () => {
        folderSelectionModal.classList.remove('active');
        showStatus('Wybór folderu anulowany. Pobieranie przerwane.', 'warning');
        currentDownloadInfo = null;
    });
    closeFolderModalButton.addEventListener('click', () => {
        folderSelectionModal.classList.remove('active');
        currentDownloadInfo = null;
    });

    closeVersionModalButton.addEventListener('click', () => {
        versionModal.classList.remove('active');
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === versionModal) versionModal.classList.remove('active');
        if (event.target === folderSelectionModal) {
             folderSelectionModal.classList.remove('active');
             currentDownloadInfo = null;
        }
    });

    function showStatus(message, type = 'info', showLoaderIconInResults = false) {
        statusBar.style.display = 'block';
        statusText.textContent = message;
        statusText.className = 'status-text-field';
        statusText.classList.add(`status-${type}`);

        const existingLoader = resultsArea.querySelector('.loader');
        if (existingLoader && !showLoaderIconInResults) {
            existingLoader.remove();
        }
    }
    
    window.electronAPI.onDownloadStarted(({ filename, totalBytes }) => {
        showStatus(`Rozpoczęto pobieranie: ${filename}`, 'info');
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
        progressBarContainer.style.display = 'flex';
    });

    window.electronAPI.onDownloadProgress(({ filename, receivedBytes, totalBytes }) => {
        const percent = totalBytes > 0 ? Math.round((receivedBytes / totalBytes) * 100) : 0;
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `${percent}%`;
        if (progressBarContainer.style.display === 'flex') { 
             statusText.textContent = `Pobieranie ${filename}: ${percent}% (${(receivedBytes/1024/1024).toFixed(2)}MB / ${(totalBytes > 0 ? (totalBytes/1024/1024).toFixed(2) : 'N/A')}MB)`;
             statusText.className = 'status-text-field status-info';
        }
    });

    window.electronAPI.onDownloadComplete(({ filename, path }) => {
        showStatus(`Pomyślnie pobrano "${filename}" do "${path}".`, 'success');
        progressBarContainer.style.display = 'none';
        window.electronAPI.showInfoMessage({title: "Pobieranie Zakończone", content: `Pomyślnie pobrano "${filename}" do:\n${path}`});
    });

    window.electronAPI.onDownloadError(({ filename, error }) => {
        showStatus(`Błąd pobierania "${filename}": ${error}`, 'error');
        progressBarContainer.style.display = 'none';
        window.electronAPI.showErrorMessage({title: "Błąd Pobierania", content: `Nie udało się pobrać "${filename}".\nBłąd: ${error}`});
    });
    
    window.addEventListener('beforeunload', () => {
        window.electronAPI.removeAllDownloadListeners();
    });

    statusBar.style.display = 'none';
    progressBarContainer.style.display = 'none';
});
