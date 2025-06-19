document.addEventListener("DOMContentLoaded", () => {
  const landingPage = document.getElementById('landingPage');
  const selectModrinthBtn = document.getElementById('selectModrinth');
  const selectCurseForgeBtn = document.getElementById('selectCurseForge');
  const appWrapper = document.querySelector('.app-wrapper');
  const appTitle = document.getElementById('appTitle');
  const backToMenuBtn = document.getElementById('backToMenuBtn');
  const searchArea = document.getElementById('searchArea');

  const categorySelect = document.getElementById("categorySelect");
  const modQueryInput = document.getElementById("modQuery");
  const searchButton = document.getElementById("searchButton");
  const defaultModsButton = document.getElementById("defaultModsButton");
  const resultsArea = document.getElementById("resultsArea");
  const resultsTitle = document.getElementById("resultsTitle");
  const statusBar = document.getElementById("statusBar");
  const statusText = document.getElementById("statusText");
  const progressBarContainer = document.getElementById("progressBarContainer");
  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");

  const loaderControlItem = document.getElementById("loaderControlItem");
  const mcVersionControlContainer = document.getElementById("mcVersionControlContainer");
  const activeLoaderDisplay = document.getElementById("activeLoaderDisplay");
  const activeMcVersionsDisplay = document.getElementById("activeMcVersionsDisplay");

  const initialVersionSelectionModal = document.getElementById("initialVersionSelectionModal");
  const initialModalTitle = document.getElementById("initialModalTitle");
  const initialModalText = document.getElementById("initialModalText");
  const mcVersionSelect = document.getElementById("mcVersionSelect");
  const confirmInitialVersionButton = document.getElementById("confirmInitialVersionButton");

  const versionModal = document.getElementById("versionModal");
  const modalModTitle = document.getElementById("modalModTitle");
  const modalVersionsList = document.getElementById("modalVersionsList");
  const closeVersionModalButton = document.getElementById("closeVersionModalButton");

  const folderSelectionModal = document.getElementById("folderSelectionModal");
  const folderModalFilename = document.getElementById("folderModalFilename");
  const customPathInput = document.getElementById("customPathInput");
  const browseFolderButton = document.getElementById("browseFolderButton");
  const openSelectedFolderButton = document.getElementById("openSelectedFolderButton");
  const confirmFolderButton = document.getElementById("confirmFolderButton");
  const cancelFolderButton = document.getElementById("cancelFolderButton");
  const closeFolderModalButton = document.getElementById("closeFolderModalButton");
  const profileChoiceModal = document.getElementById("profileChoiceModal");
  const profileChoiceModalTitle = document.getElementById("profileChoiceModalTitle");
  const profileChoiceModalMcVersion = document.getElementById("profileChoiceModalMcVersion");
  const profileChoiceSelect = document.getElementById("profileChoiceSelect");
  const confirmProfileChoiceButton = document.getElementById("confirmProfileChoiceButton");
  const cancelProfileChoiceButton = document.getElementById("cancelProfileChoiceButton");
  const closeProfileChoiceModalButton = document.getElementById("closeProfileChoiceModalButton");

  const defaultModsFilterContainer = document.getElementById("defaultModsFilterContainer");
  const defaultModFilterQuery = document.getElementById("defaultModFilterQuery");

  let currentService = '';
  let currentDownloadInfo = null;
  const MODRINTH_API_BASE = "https://api.modrinth.com/v2";
  const DEFAULT_LOADER = "fabric";
  let availableMcVersions = [];
  let groupedProfileFolders = {};
  let afterVersionSelectedCallback = null;

  const CURSEFORGE_MOD_CLASS_ID = 6;
  const CURSEFORGE_SHADER_CLASS_ID = 6552;

  // Handler dla błędów ładowania obrazków
  function handleImageError(event) {
    console.warn(`Nie udało się załadować obrazu: ${event.target.src}. Ukrywam element.`);
    event.target.style.display = 'none';
    // Można też ustawić obrazek zastępczy:
    // event.target.src = 'path/to/fallback-image.png';
  }

  // Dodanie error handlerów do obrazków na stronie powitalnej
  const landingLogo = document.querySelector('.landing-logo');
  if (landingLogo) {
    landingLogo.addEventListener('error', handleImageError);
  }
  document.querySelectorAll('.platform-choice-icon').forEach(img => {
    img.addEventListener('error', handleImageError);
  });


  function initializeForService(serviceName) {
      currentService = serviceName;
      landingPage.classList.add('hidden');
      appWrapper.classList.remove('hidden');

      loadMinecraftVersions();

      if (serviceName === 'preinstalled') {
          appTitle.textContent = 'Domyślne Mody';
          searchArea.classList.add('hidden');
          categorySelect.parentElement.style.display = 'none';
          loaderControlItem.style.display = 'none';
          mcVersionControlContainer.style.display = 'flex';
          resultsTitle.style.display = 'none';
          resultsArea.innerHTML = '';
          handlePreinstalledModsFlow();
      } else {
          const platformName = serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
          appTitle.textContent = `${platformName} Manager`;
          updateSearchPlaceholder();
          searchArea.classList.remove('hidden');
          categorySelect.parentElement.style.display = 'flex';
          loaderControlItem.style.display = 'flex';
          mcVersionControlContainer.style.display = 'flex';
          categorySelect.value = 'mod';

          afterVersionSelectedCallback = (selectedVersion) => {
              updateActiveFiltersDisplay();
              const isShaders = categorySelect.value === 'shader';
              modQueryInput.disabled = isShaders ? false : !selectedVersion;
              searchButton.disabled = isShaders ? false : !selectedVersion;
              showStatus(`Wybrano wersję ${selectedVersion}. Możesz wyszukiwać.`, "success");
          };
          initialModalTitle.textContent = 'Wybierz wersję do wyszukiwania';
          initialModalText.textContent = 'Wybierz wersję Minecrafta, dla której chcesz szukać online.';
          initialVersionSelectionModal.classList.add('active');
      }
  }

  function returnToLandingPage() {
      currentService = '';
      appWrapper.classList.add('hidden');
      landingPage.classList.remove('hidden');

      resultsArea.innerHTML = '';
      modQueryInput.value = '';
      resultsTitle.style.display = 'none';
      statusBar.style.display = 'none';
      defaultModsFilterContainer.style.display = 'none';
      document.title = 'Ogulniega Mod Manager';
  }

  function handlePreinstalledModsFlow() {
      afterVersionSelectedCallback = (selectedVersion) => {
          updateActiveFiltersDisplay();
          const profilesForVersion = groupedProfileFolders[selectedVersion];
          if (!profilesForVersion || profilesForVersion.length === 0) {
              showStatus(`Nie znaleziono profilu dla wersji ${selectedVersion}.`, "error");
              return;
          }

          handleProfileSelection(profilesForVersion, selectedVersion, (profilePath) => {
              fetchAndDisplayPreinstalledMods(profilePath, selectedVersion);
          });
      };

      initialModalTitle.textContent = 'Wybierz wersję dla domyślnych modów';
      initialModalText.textContent = 'Wybierz wersję Minecrafta, której domyślne mody chcesz przeglądać.';
      initialVersionSelectionModal.classList.add('active');
  }

  async function performSearch() {
      defaultModsFilterContainer.style.display = "none";
      if (currentService === 'modrinth') {
          await performModrinthSearch();
      } else if (currentService === 'curseforge') {
          await performCurseForgeSearch();
      }
  }

  function handleSearchError(error) {
      console.error(`Błąd wyszukiwania (${currentService}):`, error);
      const categoryName = categorySelect.value === 'mod' ? 'modów' : 'shaderów';
      resultsArea.innerHTML = `<p class="no-results">Wystąpił błąd podczas wyszukiwania ${categoryName}: ${error.message}</p>`;
      showStatus(`Błąd wyszukiwania: ${error.message}`, "error");
      window.electronAPI.showErrorMessage({ title: "Błąd Wyszukiwania", content: error.message });
  }

  async function performModrinthSearch() {
    const query = modQueryInput.value.trim();
    const currentLoader = getSelectedLoader();
    const category = categorySelect.value;
    const currentMcVersions = getSelectedMcVersions(category);
    const categoryName = category === 'mod' ? 'modów' : 'shaderów';

    if (category === 'mod' && currentMcVersions.length === 0) {
        showStatus(`Wybierz wersję MC, aby wyszukać mody.`, "warning");
        return;
    }
    if (!query) {
        showStatus(`Wpisz frazę do wyszukania ${categoryName}.`, "warning");
        return;
    }

    showStatus(`Wyszukiwanie "${query}" na Modrinth...`, "info", true);
    resultsArea.innerHTML = '<div class="loader"></div>';
    resultsTitle.textContent = `Wyniki wyszukiwania - ${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} - Modrinth`;
    resultsTitle.style.display = "block";

    const facets = [
        [`project_type:${category}`],
        ...currentMcVersions.map(v => [`versions:${v}`])
    ];
    if (category === 'mod') {
        facets.push([`categories:${currentLoader}`]);
    }

    const url = `${MODRINTH_API_BASE}/search?query=${encodeURIComponent(query)}&facets=${encodeURIComponent(JSON.stringify(facets))}&limit=20`;

    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'OgulniegaModManager/2.0' } });
        if (!response.ok) throw new Error(`Błąd API Modrinth: ${response.statusText}`);
        const data = await response.json();
        displayModrinthResults(data.hits);
        showStatus(`Znaleziono ${data.hits.length} wyników pasujących do kryteriów.`, "success");
    } catch (error) {
        handleSearchError(error);
    }
  }

  function displayModrinthResults(hits) {
    resultsArea.innerHTML = "";
    const categoryName = categorySelect.value === 'mod' ? 'modów' : 'shaderów';
    if (!hits || hits.length === 0) {
      resultsArea.innerHTML = `<p class="no-results">Nie znaleziono ${categoryName} na Modrinth.</p>`;
      return;
    }
    hits.forEach((mod, index) => {
      const modCard = createModCard({
        id: mod.project_id,
        slug: mod.slug,
        title: mod.title,
        author: mod.author,
        summary: mod.description,
        iconUrl: mod.icon_url,
        downloads: mod.downloads,
        categories: mod.categories,
      }, index);
      resultsArea.appendChild(modCard);
    });
  }

  async function performCurseForgeSearch() {
      const query = modQueryInput.value.trim();
      const category = categorySelect.value;
      const currentMcVersion = getSelectedMcVersions(category)[0];
      const classId = category === 'mod' ? CURSEFORGE_MOD_CLASS_ID : CURSEFORGE_SHADER_CLASS_ID;
      const categoryName = category === 'mod' ? 'modów' : 'shaderów';

      if (category === 'mod' && !currentMcVersion) {
        showStatus(`Wybierz wersję MC, aby wyszukać mody.`, "warning");
        return;
      }
      if (!query) {
          showStatus(`Proszę wpisać frazę do wyszukania ${categoryName}.`, "warning");
          return;
      }

      showStatus(`Wyszukiwanie "${query}" na CurseForge...`, "info", true);
      resultsArea.innerHTML = '<div class="loader"></div>';
      resultsTitle.textContent = `Wyniki wyszukiwania - ${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} - CurseForge`;
      resultsTitle.style.display = "block";
      try {
          const result = await window.electronAPI.searchCurseforge({ query, gameVersion: currentMcVersion, classId });
          if (result.success) {
              displayCurseForgeResults(result.data);
              showStatus(`Znaleziono ${result.data.length} wyników na CurseForge.`, "success");
          } else {
              throw new Error(result.error);
          }
      } catch (error) {
          handleSearchError(error);
      }
  }

  function displayCurseForgeResults(hits) {
      resultsArea.innerHTML = "";
      const categoryName = categorySelect.value === 'mod' ? 'modów' : 'shaderów';
      if (!hits || hits.length === 0) {
          resultsArea.innerHTML = `<p class="no-results">Nie znaleziono ${categoryName} na CurseForge.</p>`;
          return;
      }
      hits.forEach((mod, index) => {
          const modCard = createModCard({
              id: mod.id,
              title: mod.name,
              author: mod.authors?.map(a => a.name).join(', ') ?? 'Nieznany',
              summary: mod.summary,
              iconUrl: mod.logo ? mod.logo.url : null,
              downloads: mod.downloadCount,
              categories: mod.categories?.map(c => c.name) ?? [],
          }, index);
          resultsArea.appendChild(modCard);
      });
  }

  function createModCard(modData, index) {
      const modCard = document.createElement("div");
      modCard.className = "mod-card";
      modCard.style.animationDelay = `${index * 0.05}s`;
      const category = categorySelect.value;

      const modIcon = document.createElement('img');
      modIcon.src = modData.iconUrl || 'icons/jar.png'; // Ustawia src, domyślnie jar.png jeśli iconUrl jest null/undefined
      modIcon.alt = modData.title;
      modIcon.className = 'mod-icon';
      modIcon.onerror = function() { // Handler błędu ładowania ikony moda
          this.onerror = null; // Zapobiega pętli błędów, jeśli ikona zastępcza też się nie załaduje
          this.src = 'icons/jar.png'; // Ścieżka do lokalnej ikony zastępczej
          console.warn(`Nie udało się załadować ikony dla moda: ${modData.title} z ${modData.iconUrl}. Używam domyślnej ikony (jar.png).`);
      };
      
      const headerDiv = document.createElement('div');
      headerDiv.className = 'mod-card-header';
      headerDiv.appendChild(modIcon); // Dodaj obrazek jako pierwszy

      const titleAuthorDiv = document.createElement('div');
      titleAuthorDiv.className = 'mod-title-author';
      titleAuthorDiv.innerHTML = `
          <h3>${modData.title}</h3>
          <p>Autor: <strong>${modData.author || 'Nieznany'}</strong></p>`;
      headerDiv.appendChild(titleAuthorDiv);

      modCard.appendChild(headerDiv);

      // Reszta karty moda - UWAGA: użycie innerHTML += czyści istniejące event listenery,
      // ale tutaj obrazek jest już dodany, więc jego listener 'onerror' pozostanie.
      // Lepiej by było tworzyć wszystkie elementy za pomocą createElement i appendChild,
      // ale dla uproszczenia pozostawiam tak, jak było częściowo wcześniej.
      const bodyAndActionsHTML = `
          <div class="mod-card-body">
              <p class="mod-summary">${modData.summary}</p>
              <div class="mod-card-info">
                  <p>Pobrania: <strong>${formatDownloadCount(modData.downloads)}</strong></p>
                  <p>Kategorie: ${modData.categories?.join(', ').replace(/_/g, " ") ?? 'Brak'}</p>
              </div>
          </div>
          <div class="mod-card-actions">
              <button class="btn btn-primary" data-mod-id="${modData.id}" data-mod-slug="${modData.slug || ''}" data-mod-title="${modData.title}" data-category="${category}">
                  Pobierz / Wersje
              </button>
          </div>`;
      
      const tempDiv = document.createElement('div'); // Tworzymy tymczasowy div, aby sparsować HTML
      tempDiv.innerHTML = bodyAndActionsHTML;
      
      // Dodajemy elementy z tymczasowego diva do modCard
      while (tempDiv.firstChild) {
          modCard.appendChild(tempDiv.firstChild);
      }


      modCard.querySelector('button').addEventListener('click', (e) => {
          const { modId, modTitle, category } = e.currentTarget.dataset;
          if (currentService === 'modrinth') {
              handleModrinthVersionSelection(modId, modTitle, category);
          } else if (currentService === 'curseforge') {
              handleCurseForgeVersionSelection(modId, modTitle, category);
          }
      });
      return modCard;
  }

  async function handleModrinthVersionSelection(modId, modTitle, category) {
      const currentMcVersions = getSelectedMcVersions(category);
      showStatus(`Pobieranie listy wersji dla "${modTitle}"...`, "info", true);
      openVersionModal(modTitle);

      const loaders = JSON.stringify([getSelectedLoader()]);
      const game_versions = JSON.stringify(currentMcVersions);

      let url = `${MODRINTH_API_BASE}/project/${modId}/version?`;
      if (category === 'mod') {
          url += `loaders=${loaders}&game_versions=${game_versions}`;
      }

      try {
          const response = await fetch(url);
          let versions = await response.json();
          if (!response.ok || versions.length === 0) {
              const allVersionsResponse = await fetch(`${MODRINTH_API_BASE}/project/${modId}/version`);
              versions = await allVersionsResponse.json();
          }
          displayVersionsInModal(versions.map(v => ({
              file: v.files.find(f => f.primary) || v.files[0],
              ...v
          })), modTitle);
      } catch (error) {
          handleVersionFetchError(error, modTitle);
      }
  }

  async function handleCurseForgeVersionSelection(modId, modTitle, category) {
      const currentMcVersion = getSelectedMcVersions(category)[0];
      showStatus(`Pobieranie listy wersji dla "${modTitle}"...`, "info", true);
      openVersionModal(modTitle);
      try {
          const result = await window.electronAPI.getModFilesCurseforge({ modId, gameVersion: currentMcVersion, category });
          if (!result.success) throw new Error(result.error);
          displayVersionsInModal(result.data.map(v => ({
              id: v.id,
              name: v.displayName,
              gameVersions: v.gameVersions,
              date: v.fileDate,
              file: { url: v.downloadUrl, filename: v.fileName, size: v.fileLength }
          })), modTitle);
      } catch (error) {
          handleVersionFetchError(error, modTitle);
      }
  }

  function openVersionModal(modTitle) {
      modalModTitle.textContent = `Wybierz wersję dla: ${modTitle}`;
      modalVersionsList.innerHTML = '<div class="loader"></div>';
      versionModal.classList.add("active");
  }

  function handleVersionFetchError(error, modTitle) {
      modalVersionsList.innerHTML = `<p class="no-results">Błąd pobierania wersji dla "${modTitle}": ${error.message}</p>`;
      showStatus(`Błąd pobierania wersji: ${error.message}`, "error");
  }

  function displayVersionsInModal(versions, modTitle) {
      modalVersionsList.innerHTML = "";
      if (!versions || versions.length === 0) {
          modalVersionsList.innerHTML = '<p class="no-results">Nie znaleziono plików.</p>';
          return;
      }
      versions.sort((a, b) => new Date(b.date) - new Date(a.date));
      versions.forEach((version) => {
          if (!version.file || !version.file.url) return;
          const item = document.createElement("div");
          item.className = "version-item";
          item.innerHTML = `
              <div class="version-details">
                  <p class="version-name">${version.name}</p>
                  <p>MC: ${version.gameVersions?.join(", ") ?? 'N/A'} | Data: ${new Date(version.date).toLocaleDateString()}</p>
                  <p>Plik: ${version.file.filename}</p>
              </div>
              <div class="version-actions">
                  <button class="btn btn-primary download-version-button" data-file-url="${version.file.url}" data-file-name="${version.file.filename}">
                      Pobierz
                  </button>
              </div>`;
          modalVersionsList.appendChild(item);
      });

      document.querySelectorAll(".download-version-button").forEach(button => {
          button.addEventListener("click", async (e) => {
              currentDownloadInfo = {
                  url: e.currentTarget.dataset.fileUrl,
                  filename: e.currentTarget.dataset.fileName,
              };
              versionModal.classList.remove("active");

              const category = categorySelect.value;

              if (category === 'shader') {

                  try {
                      const shaderPath = await window.electronAPI.getShaderPath();
                      openFolderSelectionModal(currentDownloadInfo.filename, shaderPath);
                  } catch (error) {
                      console.error("Nie udało się pobrać ścieżki dla shaderów:", error);
                      showStatus("Błąd przy ustalaniu ścieżki dla shaderów.", "error");
                  }
              } else {

                  const selectedMcVersion = getSelectedMcVersions('mod')[0];
                  const profiles = groupedProfileFolders[selectedMcVersion] || [];
                  if (profiles.length > 1) {
                      handleProfileSelection(profiles, selectedMcVersion, (chosenPath) => {
                        openFolderSelectionModal(currentDownloadInfo.filename, chosenPath);
                      });
                  } else {
                      const defaultPath = profiles.length === 1 ? profiles[0].path : null;
                      openFolderSelectionModal(currentDownloadInfo.filename, defaultPath);
                  }
              }
          });
      });
  }

  function formatDownloadCount(num) {
      if (num == null) return "0";
      if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
      if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
      return num.toString();
  }

  function updateUIState(isShaders = false) {
      const isMcVersionSelected = mcVersionSelect.value !== "";
      modQueryInput.disabled = isShaders ? false : !isMcVersionSelected;
      searchButton.disabled = isShaders ? false : !isMcVersionSelected;
  }

  async function loadMinecraftVersions() {
      try {
          const profileData = await window.electronAPI.getProfileFolders();
          availableMcVersions = profileData.minecraftVersions;
          groupedProfileFolders = profileData.groupedProfileFolders;
          mcVersionSelect.innerHTML = '<option value="">-- Wybierz wersję MC --</option>';
          if (availableMcVersions.length > 0) {
              availableMcVersions.forEach(version => mcVersionSelect.add(new Option(version, version)));
              mcVersionSelect.disabled = false;
              confirmInitialVersionButton.disabled = false;
          } else {
              mcVersionSelect.innerHTML = '<option value="">-- Brak wersji --</option>';
              mcVersionSelect.disabled = true;
              confirmInitialVersionButton.disabled = true;
              showStatus("Nie znaleziono folderów profili Minecrafta.", "warning");
          }
      } catch (error) {
          showStatus("Błąd wczytywania wersji MC.", "error");
      }
  }

  function getSelectedLoader() { return DEFAULT_LOADER; }

  function getSelectedMcVersions(category = 'mod') {
      if (category === 'shader') {
          return [];
      }
      return mcVersionSelect.value ? [mcVersionSelect.value] : [];
  }

  function updateActiveFiltersDisplay() {
      activeLoaderDisplay.textContent = getSelectedLoader().charAt(0).toUpperCase() + getSelectedLoader().slice(1);
      const selectedVersion = getSelectedMcVersions('mod')[0];
      activeMcVersionsDisplay.textContent = selectedVersion || "N/A";
      activeMcVersionsDisplay.title = selectedVersion ? `Wybrana wersja: ${selectedVersion}` : "Nie wybrano wersji";
      updateUIState(categorySelect.value === 'shader');
  }

  function updateSearchPlaceholder() {
      const categoryName = categorySelect.value === 'mod' ? 'mody' : 'shadery';
      const platformName = currentService.charAt(0).toUpperCase() + currentService.slice(1);
      if (categorySelect.value === 'shader') {
        modQueryInput.placeholder = `Wyszukaj ${categoryName} na ${platformName}...`;
      } else {
        modQueryInput.placeholder = `Wybierz wersję MC, aby wyszukać ${categoryName}...`;
      }
  }

  async function openFolderSelectionModal(filenameToDownload, targetPath = null) {
      folderModalFilename.textContent = filenameToDownload;
      customPathInput.value = targetPath || "";
      folderSelectionModal.classList.add("active");
  }

  function showStatus(message, type = "info", showLoaderIcon = false) {
      statusBar.style.display = "block";
      statusText.className = "status-text-field";
      statusText.classList.add(`status-${type}`);
      statusText.textContent = message;
      if (resultsArea.querySelector('.loader') && !showLoaderIcon) {
          resultsArea.innerHTML = '';
      }
  }

  function displayPreinstalledMods(files) {
    resultsArea.innerHTML = "";
    if (!files || files.length === 0) {
        resultsArea.innerHTML = `<p class="no-results">Nie znaleziono domyślnych modów.</p>`;
        return;
    }
    files.forEach((file, index) => {
        const modCard = document.createElement("div");
        modCard.className = "mod-card local-mod-card";
        modCard.id = `local-mod-card-${index}`;
        const isEnabled = !file.isDisabled;
        modCard.innerHTML = `
            <div class="mod-card-header">
                <img src="icons/jar.png" alt="Lokalny Mod" class="mod-icon">
                <div class="mod-title-author">
                    <h3>${file.displayName}</h3>
                    <p>Plik lokalny (${ isEnabled ? "Włączony" : "Wyłączony" })</p>
                </div>
            </div>
            <div class="mod-card-body">
                <p>Ścieżka: <strong>${ file.relativePath }</strong></p>
            </div>
            <div class="mod-card-actions">
                <button class="btn ${isEnabled ? 'btn-primary' : 'btn-danger-state'} toggle-mod-button" data-path="${file.path}">
                    ${isEnabled ? "Włączony" : "Wyłączony"}
                </button>
            </div>`;
        resultsArea.appendChild(modCard);
    });
    document.querySelectorAll(".toggle-mod-button").forEach(button => {
        button.addEventListener("click", async (e) => {
            const path = e.target.dataset.path;
            const result = await window.electronAPI.toggleModState(path);
            if (result.success) {
                const selectedVersion = getSelectedMcVersions()[0];
                const profiles = groupedProfileFolders[selectedVersion];
                if (profiles && profiles.length > 0) {
                    const currentProfile = profiles.find(p => result.newPath.includes(p.path)) || profiles[0];
                    fetchAndDisplayPreinstalledMods(currentProfile.path, selectedVersion);
                }
            } else {
                showStatus(`Błąd: ${result.error}`, 'error');
            }
        });
    });
  }

  function handleProfileSelection(profiles, mcVersion, onConfirmCallback) {
      if (profiles.length === 1) {
          onConfirmCallback(profiles[0].path);
      } else {
          profileChoiceModalTitle.textContent = "Wybierz profil";
          profileChoiceModalMcVersion.textContent = mcVersion;
          profileChoiceSelect.innerHTML = "";
          profiles.forEach(p => profileChoiceSelect.add(new Option(p.name, p.path)));
          profileChoiceModal.classList.add("active");

          confirmProfileChoiceButton.addEventListener("click", () => {
              const selectedPath = profileChoiceSelect.value;
              profileChoiceModal.classList.remove("active");
              onConfirmCallback(selectedPath);
          }, { once: true });

          cancelProfileChoiceButton.addEventListener('click', () => profileChoiceModal.classList.remove('active'), { once: true });
          closeProfileChoiceModalButton.addEventListener('click', () => profileChoiceModal.classList.remove('active'), { once: true });
      }
  }

  async function fetchAndDisplayPreinstalledMods(profilePath, mcVersion) {
      const profileName = profilePath.split(/\/|\\/).pop();
      showStatus(`Wczytywanie domyślnych modów dla '${profileName}'...`, "info", true);
      resultsArea.innerHTML = '<div class="loader"></div>';
      resultsTitle.textContent = `Domyślne mody (MC ${mcVersion} - Profil: ${profileName})`;
      resultsTitle.style.display = "block";
      defaultModsFilterContainer.style.display = "flex";
      try {
          const result = await window.electronAPI.getPreinstalledMods(profilePath);
          if (result.success) {
              displayPreinstalledMods(result.files);
          } else { throw new Error(result.error); }
      } catch (error) {
          resultsArea.innerHTML = `<p class="no-results">Błąd: ${error.message}</p>`;
      }
  }

  selectModrinthBtn.addEventListener('click', () => initializeForService('modrinth'));
  selectCurseForgeBtn.addEventListener('click', () => initializeForService('curseforge'));
  defaultModsButton.addEventListener('click', () => initializeForService('preinstalled'));
  backToMenuBtn.addEventListener('click', returnToLandingPage);

  confirmInitialVersionButton.addEventListener("click", () => {
      if (mcVersionSelect.value && afterVersionSelectedCallback) {
          initialVersionSelectionModal.classList.remove("active");
          afterVersionSelectedCallback(mcVersionSelect.value);
      }
  });

  mcVersionControlContainer.querySelector('button').addEventListener("click", () => {
    let callback;
    if (currentService === 'preinstalled') {
        callback = (selectedVersion) => {
            updateActiveFiltersDisplay();
            const profiles = groupedProfileFolders[selectedVersion];
            if (profiles) handleProfileSelection(profiles, selectedVersion, (profilePath) => {
                fetchAndDisplayPreinstalledMods(profilePath, selectedVersion);
            });
        };
    } else {
        callback = (selectedVersion) => {
            updateActiveFiltersDisplay();
            showStatus(`Zmieniono wersję MC na ${selectedVersion}.`, "success");
        };
    }
    afterVersionSelectedCallback = callback;
    initialModalTitle.textContent = 'Zmień wersję Minecrafta';
    initialModalText.textContent = 'Wybierz nową wersję do przeglądania.';
    initialVersionSelectionModal.classList.add('active');
  });

  searchButton.addEventListener("click", performSearch);
  modQueryInput.addEventListener("keypress", (e) => { if (e.key === 'Enter') performSearch(); });

  defaultModFilterQuery.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const modCards = resultsArea.querySelectorAll('.local-mod-card');
    modCards.forEach(card => {
      const modName = card.querySelector('h3').textContent.toLowerCase();
      if (modName.includes(searchTerm)) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  });

  categorySelect.addEventListener('change', () => {
      const isShaders = categorySelect.value === 'shader';
      updateSearchPlaceholder();
      loaderControlItem.style.display = isShaders ? 'none' : 'flex';
      mcVersionControlContainer.style.display = isShaders ? 'none' : 'flex';
      updateUIState(isShaders);
      resultsArea.innerHTML = '';
      resultsTitle.style.display = 'none';
      statusBar.style.display = 'none';
  });

  browseFolderButton.addEventListener("click", async () => {
    const selectedPath = await window.electronAPI.browseForDirectory();
    if (selectedPath) customPathInput.value = selectedPath;
  });

  openSelectedFolderButton.addEventListener("click", () => {
    const targetPath = customPathInput.value.trim();
    if (targetPath) {
      window.electronAPI.showItemInFolder(targetPath);
    }
  });

  confirmFolderButton.addEventListener("click", () => {
    const selectedDirectory = customPathInput.value.trim();
    if (!selectedDirectory || !currentDownloadInfo) return;
    folderSelectionModal.classList.remove("active");
    showStatus(`Pobieranie "${currentDownloadInfo.filename}"...`, "info");
    progressBarContainer.style.display = "flex";
    window.electronAPI.downloadFile({
        url: currentDownloadInfo.url,
        directoryPath: selectedDirectory,
        filename: currentDownloadInfo.filename,
    });
  });

  [closeVersionModalButton, cancelFolderButton, closeFolderModalButton, closeProfileChoiceModalButton, cancelProfileChoiceButton].forEach(btn => {
      btn?.addEventListener("click", () => {
          btn.closest('.modal-overlay').classList.remove('active');
      });
  });

  window.electronAPI.onDownloadStarted(() => {
    progressBarContainer.style.display = 'flex';
  });
  window.electronAPI.onDownloadProgress(({ receivedBytes, totalBytes }) => {
      const percent = totalBytes > 0 ? Math.round((receivedBytes / totalBytes) * 100) : 0;
      progressBar.style.width = `${percent}%`;
      progressText.textContent = `${percent}%`;
  });
  window.electronAPI.onDownloadComplete(({ filename }) => {
      showStatus(`Pomyślnie pobrano "${filename}".`, "success");
      setTimeout(() => { progressBarContainer.style.display = 'none'; }, 2000);
  });
  window.electronAPI.onDownloadError(({ error }) => {
      showStatus(`Błąd pobierania: ${error}`, "error");
      progressBarContainer.style.display = 'none';
  });

  window.addEventListener("beforeunload", () => {
    window.electronAPI.removeAllDownloadListeners();
  });
});