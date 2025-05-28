document.addEventListener('DOMContentLoaded', () => {
    const modQueryInput = document.getElementById('modQuery');
    const searchButton = document.getElementById('searchButton');
    const defaultModsButton = document.getElementById('defaultModsButton');
    const resultsArea = document.getElementById('resultsArea');
    const resultsTitle = document.getElementById('resultsTitle');
    const statusBar = document.getElementById('statusBar');
    const statusText = document.getElementById('statusText');
    const progressBarContainer = document.getElementById('progressBarContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    const activeLoaderDisplay = document.getElementById('activeLoaderDisplay');
    const activeMcVersionsDisplay = document.getElementById('activeMcVersionsDisplay');

    const initialVersionSelectionModal = document.getElementById('initialVersionSelectionModal');
    const mcVersionSelect = document.getElementById('mcVersionSelect');
    const confirmInitialVersionButton = document.getElementById('confirmInitialVersionButton');
    const openVersionSelectionModalButton = document.getElementById('openVersionSelectionModalButton');

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

    const preinstalledProfileSelectionModal = document.getElementById('preinstalledProfileSelectionModal');
    const preinstalledModalMcVersion = document.getElementById('preinstalledModalMcVersion');
    const preinstalledProfileSelect = document.getElementById('preinstalledProfileSelect');
    const confirmPreinstalledProfileButton = document.getElementById('confirmPreinstalledProfileButton');
    const cancelPreinstalledProfileButton = document.getElementById('cancelPreinstalledProfileButton');
    const closePreinstalledProfileModalButton = document.getElementById('closePreinstalledProfileModalButton');

    const defaultModsFilterContainer = document.getElementById('defaultModsFilterContainer');
    const defaultModFilterQuery = document.getElementById('defaultModFilterQuery');

    let currentDownloadInfo = null;
    const MODRINTH_API_BASE = "https://api.modrinth.com/v2";

    const DEFAULT_LOADER = "fabric";
    let availableMcVersions = [];
    let groupedProfileFolders = {};
    let afterProfileSelectedForPreinstalledCallback = null;
    let displayedPreinstalledModsFullList = [];

    function updateUIState() {
        const isMcVersionSelected = mcVersionSelect.value !== "";

        modQueryInput.disabled = !isMcVersionSelected;
        searchButton.disabled = !isMcVersionSelected;
        defaultModsButton.disabled = !isMcVersionSelected;

        openVersionSelectionModalButton.style.display = 'inline-flex';

        if (!isMcVersionSelected) {
            modQueryInput.placeholder = "Wybierz wersję MC, aby wyszukać mody...";
            showStatus("Proszę wybrać wersję Minecrafta, aby rozpocząć wyszukiwanie.", 'info');
            document.querySelector('.app-wrapper').style.filter = 'grayscale(100%)';
            document.querySelector('.app-wrapper').style.pointerEvents = 'none';
        } else {
            modQueryInput.placeholder = "Wpisz nazwę moda...";
            document.querySelector('.app-wrapper').style.filter = 'none';
            document.querySelector('.app-wrapper').style.pointerEvents = 'auto';
            if (statusText.textContent.includes("Proszę wybrać wersję Minecrafta")) {
                statusBar.style.display = 'none';
            }
        }
    }

    async function loadMinecraftVersions() {
        try {
            const profileData = await window.electronAPI.getProfileFolders();
            availableMcVersions = profileData.minecraftVersions;
            groupedProfileFolders = profileData.groupedProfileFolders;

            mcVersionSelect.innerHTML = '<option value="">-- Wybierz wersję MC --</option>';
            if (availableMcVersions.length > 0) {
                availableMcVersions.forEach(version => {
                    const option = document.createElement('option');
                    option.value = version;
                    option.textContent = version;
                    mcVersionSelect.appendChild(option);
                });
                mcVersionSelect.disabled = false;
            } else {
                mcVersionSelect.innerHTML = '<option value="">-- Brak znalezionych wersji --</option>';
                mcVersionSelect.disabled = true;
                confirmInitialVersionButton.disabled = true;
                showStatus("Nie znaleziono żadnych wersji Minecrafta w folderach profili. Proszę zainstalować wersje.", 'error');
            }

            if (availableMcVersions.length > 0) {
                activeMcVersionsDisplay.textContent = availableMcVersions[0];
            } else {
                activeMcVersionsDisplay.textContent = 'Brak';
            }
            activeMcVersionsDisplay.title = availableMcVersions.join(', ');

        } catch (error) {
            console.error("Błąd podczas wczytywania wersji Minecrafta z profili:", error);
            activeMcVersionsDisplay.textContent = 'Błąd wczytywania';
            mcVersionSelect.innerHTML = '<option value="">-- Błąd wczytywania wersji --</option>';
            mcVersionSelect.disabled = true;
            confirmInitialVersionButton.disabled = true;
            window.electronAPI.showErrorMessage({ title: "Błąd Wczytywania Wersji MC", content: "Nie udało się wczytać dostępnych wersji Minecrafta z folderów profili." });
        } finally {
            updateUIState();
        }
    }

    loadMinecraftVersions();

    function getSelectedLoader() {
        return DEFAULT_LOADER;
    }

    function getSelectedMcVersions() {
        const selectedVersion = mcVersionSelect.value;
        if (selectedVersion) {
            return [selectedVersion];
        }
        return [];
    }

    function updateActiveFiltersDisplay() {
        const selectedLoader = getSelectedLoader();
        const selectedMcVersions = getSelectedMcVersions();

        activeLoaderDisplay.textContent = selectedLoader.charAt(0).toUpperCase() + selectedLoader.slice(1);

        let versionsText;
        if (mcVersionSelect.value === "") {
             versionsText = availableMcVersions.length > 0 ? availableMcVersions[0] : "N/A";
        } else {
            versionsText = selectedMcVersions[0];
        }
        activeMcVersionsDisplay.textContent = versionsText;
        activeMcVersionsDisplay.title = availableMcVersions.join(', ');

        updateUIState();
    }

    mcVersionSelect.addEventListener('change', () => {
        if (mcVersionSelect.value !== "") {
            confirmInitialVersionButton.disabled = false;
            activeMcVersionsDisplay.textContent = mcVersionSelect.value;
        } else {
            confirmInitialVersionButton.disabled = true;
            activeMcVersionsDisplay.textContent = availableMcVersions.length > 0 ? availableMcVersions[0] : "N/A";
        }
    });

    confirmInitialVersionButton.addEventListener('click', () => {
        if (mcVersionSelect.value !== "") {
            initialVersionSelectionModal.classList.remove('active');
            updateActiveFiltersDisplay();
            showStatus("Wersja Minecrafta wybrana. Możesz wyszukać mody.", 'success');
            
            resultsArea.innerHTML = ''; 
            resultsTitle.style.display = 'none';
            defaultModsFilterContainer.style.display = 'none'; 
            displayedPreinstalledModsFullList = [];
        } else {
            showStatus("Proszę wybrać wersję Minecrafta.", 'warning');
        }
    });

    openVersionSelectionModalButton.addEventListener('click', () => {
        initialVersionSelectionModal.classList.add('active');
    });

    searchButton.addEventListener('click', () => {
        defaultModsFilterContainer.style.display = 'none'; 
        displayedPreinstalledModsFullList = []; 
        performSearch();
    });
    modQueryInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            defaultModsFilterContainer.style.display = 'none'; 
            displayedPreinstalledModsFullList = []; 
            performSearch();
        }
    });
    
    async function performSearch() {
        const query = modQueryInput.value.trim();
        const currentLoader = getSelectedLoader();
        const currentMcVersions = getSelectedMcVersions();

        defaultModsFilterContainer.style.display = 'none';
        displayedPreinstalledModsFullList = [];

        if (currentMcVersions.length === 0 || mcVersionSelect.value === "") {
            showStatus("Proszę wybrać wersję Minecrafta, aby wyszukać mody.", 'warning');
            return;
        }

        if (!query) {
            showStatus("Proszę wpisać nazwę moda.", 'warning');
            return;
        }
        const statusFilterText = `dla ${currentLoader} i MC (${activeMcVersionsDisplay.textContent})`;
        showStatus(`Wyszukiwanie "${query}" ${statusFilterText}...`, 'info', true);
        resultsArea.innerHTML = '<div class="loader"></div>';
        resultsTitle.textContent = "Wyniki wyszukiwania";
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
                headers: { 'User-Agent': 'ElectronPureJSModrinthApp/1.9.9 (DefaultModFilter)' }
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
                    <img src="${mod.icon_url || 'icons/jar.png'}" alt="${mod.title || 'Mod Icon'}" class="mod-icon" onerror="this.onerror=null;this.src='icons/jar.png';">
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
                headers: { 'User-Agent': 'ElectronPureJSModrinthApp/1.9.9' }
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
                response = await fetch(allVersionsUrl, { headers: { 'User-Agent': 'ElectronPureJSModrinthApp/1.9.9' }});
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

            displayVersionsInModal(versionsData, modTitle, currentMcVersions);
            showStatus(`Wyświetlono wersje dla "${modTitle}".`, 'success');

        } catch (error) {
            console.error('Błąd pobierania wersji:', error);
            modalVersionsList.innerHTML = `<p class="no-results">Błąd: ${error.message}</p>`;
            showStatus(`Błąd pobierania wersji dla "${modTitle}": ${error.message}`, 'error');
            window.electronAPI.showErrorMessage({ title: "Błąd Pobierania Wersji", content: error.message });
        }
    }

    function displayVersionsInModal(versions, modTitle, targetMcVersions) {
        modalVersionsList.innerHTML = '';
        if (!Array.isArray(versions)) {
            modalVersionsList.innerHTML = '<p class="no-results">Otrzymano nieprawidłowe dane wersji.</p>';
            return;
        }

        const filteredVersions = versions.filter(version => {
            if (!version || !Array.isArray(version.game_versions)) return false;
            return version.game_versions.some(gv => targetMcVersions.includes(gv));
        });
        
        let versionsToDisplay = filteredVersions;
        let warningMessage = '';
        if (filteredVersions.length === 0 && versions.length > 0) {
            versionsToDisplay = versions; 
            warningMessage = `<p class="warning-text">Brak wersji idealnie pasujących do MC ${targetMcVersions.join(', ')}. Wyświetlanie wszystkich dostępnych wersji dla tego moda.</p>`;
        } else if (versionsToDisplay.length === 0) {
             modalVersionsList.innerHTML = '<p class="no-results">Brak wersji moda zgodnych z wybraną wersją Minecrafta.</p>';
             return;
        }
        modalVersionsList.innerHTML = warningMessage;

        versionsToDisplay.sort((a,b) => new Date(b.date_published) - new Date(a.date_published))
                         .forEach((version, index) => {
            if (!version || !Array.isArray(version.files) || version.files.length === 0) return;
            const primaryFile = version.files.find(f => f.primary) || version.files[0];
            if (!primaryFile || !primaryFile.url || !primaryFile.filename) return;

            const item = document.createElement('div');
            item.className = 'version-item';
            item.style.animationDelay = `${index * 0.03}s`;

            const datePublished = version.date_published ? new Date(version.date_published).toLocaleDateString('pl-PL') : 'Brak daty';
            const fileSizeMB = primaryFile.size ? (primaryFile.size / 1024 / 1024).toFixed(2) : 'N/A';

            const isPerfectMatch = Array.isArray(version.game_versions) && version.game_versions.some(gv => targetMcVersions.includes(gv));
            const isFirstPerfectMatch = isPerfectMatch && filteredVersions.findIndex(fv => fv.id === version.id) === 0;
            const recommendedLabel = isFirstPerfectMatch ? '<div class="recommended-label" style="color:#4caf50;font-weight:bold;margin-top:4px;">Zalecana dla wybranej wersji MC</div>' : '';
            const buttonClass = isFirstPerfectMatch ? 'btn-download-version-top' : 'btn-download-version-secondary';

            item.innerHTML = `
                <div class="version-details">
                    <p class="version-name">${version.name || 'N/A'} (${version.version_number || 'N/A'})</p>
                    <p>MC: ${(Array.isArray(version.game_versions) ? version.game_versions.join(', ') : 'N/A')}</p>
                    <p>Loadery: ${(Array.isArray(version.loaders) ? version.loaders.join(', ') : 'N/A')}</p>
                    <p>Data: ${datePublished} | Rozmiar: ${fileSizeMB} MB</p>
                    <p>Plik: ${primaryFile.filename}</p>
                </div>
                <div class="version-actions">
                    <button class="btn ${buttonClass} download-version-button"
                            data-file-url="${primaryFile.url}"
                            data-file-name="${primaryFile.filename}"
                            data-mod-title="${modTitle}">
                        Pobierz
                    </button>
                    ${recommendedLabel}
                </div>`;
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

        const selectedMcVersion = getSelectedMcVersions()[0];
        let initialPathToSetInInput = "";
        let specificVersionProfiles = [];

        if (selectedMcVersion && groupedProfileFolders[selectedMcVersion]) {
            specificVersionProfiles = groupedProfileFolders[selectedMcVersion];

            if (specificVersionProfiles.length === 1) {
                initialPathToSetInInput = specificVersionProfiles[0].path;
            } else {
                specificVersionProfiles.forEach(folder => {
                    const option = document.createElement('option');
                    option.value = folder.path;
                    option.textContent = `Profil: ${folder.name}`;
                    profileFolderSelect.appendChild(option);
                });
                if (specificVersionProfiles.length > 0) {
                    initialPathToSetInInput = specificVersionProfiles[0].path;
                    profileFolderSelect.value = initialPathToSetInInput;
                }
            }
        }

        if (!initialPathToSetInInput) {
             const profileData = await window.electronAPI.getProfileFolders();
             if (profileData.baseProfilePath && selectedMcVersion) {
                 initialPathToSetInInput = `${profileData.baseProfilePath}${profileData.baseProfilePath.includes('/') ? '/' : '\\'}${selectedMcVersion}`;
             } else if (profileData.baseProfilePath) {
                 initialPathToSetInInput = profileData.baseProfilePath;
             }
        }

        if (initialPathToSetInInput) {
            customPathInput.value = initialPathToSetInInput;
        } else {
            customPathInput.placeholder = "Wprowadź ścieżkę ręcznie lub przeglądaj";
        }

        const profileSelectGroup = profileFolderSelect.closest('.form-group');
        if (specificVersionProfiles.length <= 1) {
            profileSelectGroup.style.display = 'none';
        } else {
            profileSelectGroup.style.display = 'block';
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

    function displayPreinstalledMods(filesToDisplay) {
        resultsArea.innerHTML = '';
        if (!filesToDisplay || filesToDisplay.length === 0) {
            const filterIsActive = defaultModFilterQuery.value.trim() !== "";
            if (filterIsActive) {
                resultsArea.innerHTML = '<p class="no-results">Nie znaleziono domyślnych modów pasujących do Twojego filtra.</p>';
            } else {
                resultsArea.innerHTML = '<p class="no-results">Nie znaleziono plików .jar w folderze "preinstalled" dla tego profilu.</p>';
            }
            return;
        }

        filesToDisplay.forEach((file, index) => {
            const modCard = document.createElement('div');
            modCard.className = 'mod-card local-mod-card';
            modCard.id = `local-mod-card-${index}`; 
            modCard.style.animationDelay = `${index * 0.05}s`;

            const isEnabled = !file.isDisabled; 
            const buttonText = isEnabled ? 'Ukryj' : 'Pokaż';
            const buttonActionClass = isEnabled ? 'btn-danger-state' : 'btn-primary'; 

            modCard._fileData = file; 

            modCard.innerHTML = `
                <div class="mod-card-header">
                    <img src="icons/jar.png" alt="Lokalny Mod" class="mod-icon" onerror="this.onerror=null;this.src='icons/icon.png';">
                    <div class="mod-title-author">
                        <h3 class="mod-filename">${file.displayName}</h3>
                        <p class="mod-status-text">Plik lokalny (${isEnabled ? 'Widoczny' : 'Ukryty'})</p>
                    </div>
                </div>
                <div class="mod-card-body">
                    <p class="mod-summary">Plik .jar znaleziony w folderze.</p>
                    <div class="mod-card-info">
                        <p>Ścieżka na dysku: <strong class="mod-relative-path">${file.relativePath}</strong></p>
                    </div>
                </div>
                <div class="mod-card-actions">
                    <button class="btn ${buttonActionClass} toggle-mod-button" data-current-fullpath="${file.path}" data-card-id="local-mod-card-${index}">
                        ${buttonText}
                    </button>
                </div>`;
            resultsArea.appendChild(modCard);
        });

        document.querySelectorAll('.toggle-mod-button').forEach(button => {
            button.addEventListener('click', async (event) => {
                const currentFullPath = event.currentTarget.dataset.currentFullpath;
                const cardId = event.currentTarget.dataset.cardId;
                const modCardElement = document.getElementById(cardId);

                if (!currentFullPath || !modCardElement) {
                    console.error("Błąd: Brak ścieżki pliku lub elementu karty dla operacji toggle.");
                    window.electronAPI.showErrorMessage({ title: "Błąd wewnętrzny", content: "Nie można zmienić stanu moda, brak referencji do pliku." });
                    return;
                }
                
                const originalFileObject = modCardElement._fileData;

                try {
                    const result = await window.electronAPI.toggleModState(currentFullPath);
                    if (result.success) {
                        originalFileObject.isDisabled = result.newStateIsDisabled;
                        originalFileObject.path = result.newFullPath;
                        originalFileObject.diskName = result.newDiskName;
                        originalFileObject.displayName = result.newDisplayName; 
                        originalFileObject.relativePath = result.newRelativePath;

                        const isNowEnabled = !originalFileObject.isDisabled;
                        
                        modCardElement.querySelector('.mod-filename').textContent = originalFileObject.displayName;
                        modCardElement.querySelector('.mod-status-text').textContent = `Plik lokalny (${isNowEnabled ? 'Widoczny' : 'Ukryty'})`;
                        modCardElement.querySelector('.mod-relative-path').textContent = originalFileObject.relativePath;
                        
                        const toggleButton = modCardElement.querySelector('.toggle-mod-button');
                        toggleButton.textContent = isNowEnabled ? 'Ukryj' : 'Pokaż';
                        toggleButton.classList.remove('btn-primary', 'btn-danger-state');
                        toggleButton.classList.add(isNowEnabled ? 'btn-danger-state' : 'btn-primary');
                        toggleButton.dataset.currentFullpath = result.newFullPath;

                        showStatus(`Mod "${originalFileObject.displayName}" został ${isNowEnabled ? 'pokazany (aktywny)' : 'ukryty (nieaktywny)'}.`, 'success');
                    } else {
                        throw new Error(result.error || "Nieznany błąd podczas przełączania stanu moda.");
                    }
                } catch (error) {
                    console.error('Błąd przełączania stanu moda:', error);
                    window.electronAPI.showErrorMessage({ title: "Błąd Operacji", content: `Nie udało się przełączyć stanu moda: ${error.message}` });
                    showStatus(`Błąd: ${error.message}`, 'error');
                }
            });
        });
    }

    async function fetchAndDisplayPreinstalledMods(profilePath, mcVersion) {
        const profileName = profilePath.split(profilePath.includes('/') ? '/' : '\\').pop();
        
        showStatus(`Wczytywanie domyślnych modów dla profilu '${profileName}' (folder 'preinstalled')...`, 'info', true);
        resultsArea.innerHTML = '<div class="loader"></div>';
        resultsTitle.textContent = `Domyślne mody (MC ${mcVersion} - Profil: ${profileName})`;
        resultsTitle.style.display = 'block';

        defaultModFilterQuery.value = ''; 
        defaultModsFilterContainer.style.display = 'flex';

        try {
            const result = await window.electronAPI.getPreinstalledMods(profilePath);
            if (result.success) {
                displayedPreinstalledModsFullList = result.files; 
                displayPreinstalledMods(displayedPreinstalledModsFullList); 
                
                if (displayedPreinstalledModsFullList.length > 0) {
                    showStatus(`Znaleziono ${displayedPreinstalledModsFullList.length} domyślnych modów w profilu '${profileName}'.`, 'success');
                } else {
                    showStatus(`Nie znaleziono domyślnych modów w folderze "preinstalled" profilu '${profileName}'.`, 'info');
                }
            } else {
                throw new Error(result.error || "Nieznany błąd podczas wczytywania domyślnych modów.");
            }
        } catch (error) {
            console.error('Błąd wczytywania domyślnych modów:', error);
            resultsArea.innerHTML = `<p class="no-results">Wystąpił błąd podczas wczytywania domyślnych modów: ${error.message}</p>`;
            defaultModsFilterContainer.style.display = 'none'; 
            showStatus(`Błąd wczytywania domyślnych modów dla profilu '${profileName}': ${error.message}`, 'error');
            window.electronAPI.showErrorMessage({ title: "Błąd Domyślnych Modów", content: `Nie udało się wczytać domyślnych modów. ${error.message}` });
        }
    }
    
    function handleProfileSelectionForPreinstalled(profilesForVersion, mcVersion) {
        if (profilesForVersion.length === 1) {
            fetchAndDisplayPreinstalledMods(profilesForVersion[0].path, mcVersion);
        } else {
            preinstalledModalMcVersion.textContent = mcVersion;
            preinstalledProfileSelect.innerHTML = '';

            profilesForVersion.forEach(profile => {
                const option = document.createElement('option');
                option.value = profile.path;
                option.textContent = profile.name;
                preinstalledProfileSelect.appendChild(option);
            });

            afterProfileSelectedForPreinstalledCallback = (selectedProfilePath) => {
                if (selectedProfilePath) {
                    fetchAndDisplayPreinstalledMods(selectedProfilePath, mcVersion);
                }
                afterProfileSelectedForPreinstalledCallback = null; 
            };
            preinstalledProfileSelectionModal.classList.add('active');
        }
    }

    defaultModsButton.addEventListener('click', async () => {
        const selectedMcVersion = getSelectedMcVersions()[0];

        if (!selectedMcVersion) {
            showStatus("Proszę najpierw wybrać wersję Minecrafta.", 'warning');
            window.electronAPI.showErrorMessage({ title: "Brak wersji MC", content: "Aby wyświetlić domyślne mody, najpierw wybierz wersję Minecrafta." });
            return;
        }
        
        let profilesForVersion = groupedProfileFolders[selectedMcVersion];

        if (!profilesForVersion || profilesForVersion.length === 0) {
            console.warn(`Brak informacji o profilu dla ${selectedMcVersion} w groupedProfileFolders. Próba ponownego załadowania.`);
            await loadMinecraftVersions();
            profilesForVersion = groupedProfileFolders[selectedMcVersion];
            
            if (!profilesForVersion || profilesForVersion.length === 0) {
                showStatus(`Nie można ustalić ścieżki profilu dla wersji ${selectedMcVersion}. Sprawdź konfigurację profili.`, 'error');
                window.electronAPI.showErrorMessage({ title: "Błąd Ścieżki Profilu", content: `Nie znaleziono skonfigurowanej ścieżki profilu dla wersji Minecraft ${selectedMcVersion}. Upewnij się, że profile są poprawnie załadowane.`});
                return;
            }
        }
        
        handleProfileSelectionForPreinstalled(profilesForVersion, selectedMcVersion);
    });

    defaultModFilterQuery.addEventListener('input', () => {
        const query = defaultModFilterQuery.value.toLowerCase().trim();
        if (displayedPreinstalledModsFullList.length > 0 || query !== "") { 
            const filteredMods = displayedPreinstalledModsFullList.filter(file => 
                file.displayName.toLowerCase().includes(query)
            );
            displayPreinstalledMods(filteredMods); 
        } else if (query === "" && displayedPreinstalledModsFullList.length > 0) {
            displayPreinstalledMods(displayedPreinstalledModsFullList); 
        }
    });

    confirmPreinstalledProfileButton.addEventListener('click', () => {
        const selectedPath = preinstalledProfileSelect.value;
        preinstalledProfileSelectionModal.classList.remove('active');
        if (selectedPath && typeof afterProfileSelectedForPreinstalledCallback === 'function') {
            afterProfileSelectedForPreinstalledCallback(selectedPath);
        } else if (typeof afterProfileSelectedForPreinstalledCallback === 'function') {
            afterProfileSelectedForPreinstalledCallback(null);
        }
        afterProfileSelectedForPreinstalledCallback = null;
    });

    cancelPreinstalledProfileButton.addEventListener('click', () => {
        preinstalledProfileSelectionModal.classList.remove('active');
        if (typeof afterProfileSelectedForPreinstalledCallback === 'function') {
            afterProfileSelectedForPreinstalledCallback(null);
        }
        afterProfileSelectedForPreinstalledCallback = null;
        showStatus("Wybór profilu dla domyślnych modów anulowany.", "warning");
    });

    closePreinstalledProfileModalButton.addEventListener('click', () => {
        preinstalledProfileSelectionModal.classList.remove('active');
        if (typeof afterProfileSelectedForPreinstalledCallback === 'function') {
            afterProfileSelectedForPreinstalledCallback(null);
        }
        afterProfileSelectedForPreinstalledCallback = null;
    });

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
    
    window.addEventListener('click', (event) => {
        if (event.target === versionModal) versionModal.classList.remove('active');
        if (event.target === folderSelectionModal) {
             folderSelectionModal.classList.remove('active');
             currentDownloadInfo = null;
        }
        if (event.target === preinstalledProfileSelectionModal) {
            preinstalledProfileSelectionModal.classList.remove('active');
            if (typeof afterProfileSelectedForPreinstalledCallback === 'function') {
                afterProfileSelectedForPreinstalledCallback(null);
            }
            afterProfileSelectedForPreinstalledCallback = null;
        }
    });

    window.addEventListener('beforeunload', () => {
        window.electronAPI.removeAllDownloadListeners();
    });

    statusBar.style.display = 'none';
    progressBarContainer.style.display = 'none';
    updateUIState();
});
