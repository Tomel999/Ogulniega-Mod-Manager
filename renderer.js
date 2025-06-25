document.addEventListener("DOMContentLoaded", () => {
  const landingPage = document.getElementById('landingPage');
  const closeAppBtn = document.getElementById('closeAppBtn');
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

  function handleImageError(event) {
    console.warn(`Nie udało się załadować obrazu: ${event.target.src}. Ukrywam element.`);
    event.target.style.display = 'none';

  }

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
      modIcon.src = modData.iconUrl || 'icons/jar.png';
      modIcon.alt = modData.title;
      modIcon.className = 'mod-icon';
      modIcon.onerror = function() {
          this.onerror = null;
          this.src = 'icons/jar.png';
          console.warn(`Nie udało się załadować ikony dla moda: ${modData.title} z ${modData.iconUrl}. Używam domyślnej ikony (jar.png).`);
      };

      const headerDiv = document.createElement('div');
      headerDiv.className = 'mod-card-header';
      headerDiv.appendChild(modIcon);

      const titleAuthorDiv = document.createElement('div');
      titleAuthorDiv.className = 'mod-title-author';
      titleAuthorDiv.innerHTML = `
          <h3>${modData.title}</h3>
          <p>Autor: <strong>${modData.author || 'Nieznany'}</strong></p>`;
      headerDiv.appendChild(titleAuthorDiv);

      modCard.appendChild(headerDiv);

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

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = bodyAndActionsHTML;

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
            const button = e.currentTarget;
            const path = button.dataset.path;
            const modCard = button.closest('.local-mod-card');
            const statusText = modCard.querySelector('.mod-title-author p');

            // Zablokuj przycisk na czas operacji
            button.disabled = true;
            button.textContent = 'Zmieniam...';

            const result = await window.electronAPI.toggleModState(path);
            
            if (result.success) {
                const isEnabled = !result.isDisabled;
                
                // Zaktualizuj atrybut ścieżki, jeśli się zmieniła (dla systemów innych niż Windows)
                button.dataset.path = result.newPath;

                // Zaktualizuj wygląd przycisku
                button.textContent = isEnabled ? "Włączony" : "Wyłączony";
                button.classList.toggle('btn-primary', isEnabled);
                button.classList.toggle('btn-danger-state', !isEnabled);

                // Zaktualizuj tekst statusu
                if (statusText) {
                    statusText.textContent = `Plik lokalny (${ isEnabled ? "Włączony" : "Wyłączony" })`;
                }

                showStatus(`Zmieniono stan moda: ${modCard.querySelector('h3').textContent}`, 'success');
            } else {
                showStatus(`Błąd: ${result.error}`, 'error');
                // Przywróć poprzedni stan przycisku w razie błędu
                const wasEnabled = button.classList.contains('btn-primary');
                button.textContent = wasEnabled ? "Włączony" : "Wyłączony";
            }
            
            // Odblokuj przycisk po zakończeniu operacji
            button.disabled = false;
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
  document.getElementById('modsProfileButton').addEventListener('click', () => openModsProfileModal());
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

  // ===== MODS PROFILE FUNCTIONALITY =====
  
  const modsProfileModal = document.getElementById('modsProfileModal');
  const closeModsProfileModalButton = document.getElementById('closeModsProfileModalButton');
  const githubRepoInput = document.getElementById('githubRepoInput');
  const minecraftVersionProfile = document.getElementById('minecraftVersionProfile');
  const profileSelectionGroup = document.getElementById('profileSelectionGroup');
  const profileFolderSelect = document.getElementById('profileFolderSelect');
  const loadProfilesButton = document.getElementById('loadProfilesButton');
  const profilesListContainer = document.getElementById('profilesListContainer');
  const profilesList = document.getElementById('profilesList');
  const profileDetailsContainer = document.getElementById('profileDetailsContainer');
  const profileDetails = document.getElementById('profileDetails');
  const downloadProfileButton = document.getElementById('downloadProfileButton');
  const profileDownloadProgress = document.getElementById('profileDownloadProgress');
  const profileProgressBar = document.getElementById('profileProgressBar');
  const profileProgressText = document.getElementById('profileProgressText');
  const currentDownloadingMod = document.getElementById('currentDownloadingMod');
  const downloadLocationInfo = document.getElementById('downloadLocationInfo');
  const targetFolderDisplay = document.getElementById('targetFolderDisplay');
  
  // New elements for mod list preview
  const profileModsListContainer = document.getElementById('profileModsListContainer');
  const profileModsPreview = document.getElementById('profileModsPreview');
  const downloadSelectedModsButton = document.getElementById('downloadSelectedModsButton');
  const backToProfilesButton = document.getElementById('backToProfilesButton');
  
  // Mod selection controls
  const selectedModsCount = document.getElementById('selectedModsCount');
  const totalModsCount = document.getElementById('totalModsCount');
  const selectAllModsButton = document.getElementById('selectAllModsButton');
  const deselectAllModsButton = document.getElementById('deselectAllModsButton');
  const modSelectionControls = document.querySelector('.mod-selection-controls');

  let currentProfile = null;

  async function openModsProfileModal() {
    // Load MC versions if not already loaded
    if (availableMcVersions.length === 0) {
      try {
        const profileData = await window.electronAPI.getProfileFolders();
        availableMcVersions = profileData.minecraftVersions;
        groupedProfileFolders = profileData.groupedProfileFolders;
      } catch (error) {
        console.error('Błąd wczytywania wersji MC:', error);
      }
    }
    
    // Populate MC versions - only from available profiles
    minecraftVersionProfile.innerHTML = '<option value="">-- Wybierz wersję MC --</option>';
    
    if (availableMcVersions.length > 0) {
      availableMcVersions.forEach(version => {
        const option = new Option(version, version);
        minecraftVersionProfile.appendChild(option);
      });
    } else {
      const option = new Option('-- Brak dostępnych profili Ogulniegi --', '');
      option.disabled = true;
      minecraftVersionProfile.appendChild(option);
    }
    
    // Set default repo if empty
    if (!githubRepoInput.value) {
      githubRepoInput.value = 'Tomel999/mod-profiles';
    }
    
    modsProfileModal.classList.add('active');
  }

  function handleMcVersionChange() {
    const selectedVersion = minecraftVersionProfile.value;
    
    if (!selectedVersion) {
      profileSelectionGroup.style.display = 'none';
      return;
    }
    
    // Get profiles for this version
    const profilesForVersion = groupedProfileFolders[selectedVersion] || [];
    
    if (profilesForVersion.length > 1) {
      // Multiple profiles - show selection
      profileSelectionGroup.style.display = 'block';
      profileFolderSelect.innerHTML = '<option value="">-- Wybierz profil --</option>';
      
      profilesForVersion.forEach(profile => {
        const option = new Option(profile.name, profile.path);
        profileFolderSelect.appendChild(option);
      });
    } else if (profilesForVersion.length === 1) {
      // Single profile - auto-select and hide selection
      profileSelectionGroup.style.display = 'none';
    } else {
      // No profiles found
      profileSelectionGroup.style.display = 'none';
    }
  }

  async function loadGithubProfiles() {
    const repoInput = githubRepoInput.value.trim();
    const mcVersion = minecraftVersionProfile.value;
    
    if (!repoInput) {
      window.electronAPI.showErrorMessage({ title: "Błąd", content: "Podaj repository GitHub!" });
      return;
    }
    
    if (!mcVersion) {
      window.electronAPI.showErrorMessage({ title: "Błąd", content: "Wybierz wersję Minecraft!" });
      return;
    }
    
    // Check if we need to select a profile folder
    const profilesForVersion = groupedProfileFolders[mcVersion] || [];
    if (profilesForVersion.length > 1 && !profileFolderSelect.value) {
      window.electronAPI.showErrorMessage({ title: "Błąd", content: "Wybierz profil dla tej wersji MC!" });
      return;
    }

    const [owner, repo] = repoInput.split('/');
    if (!owner || !repo) {
      window.electronAPI.showErrorMessage({ title: "Błąd", content: "Nieprawidłowy format repository! Użyj: owner/repo" });
      return;
    }

    loadProfilesButton.disabled = true;
    loadProfilesButton.textContent = 'Ładowanie...';
    
    try {
      // First, get the contents of the MC version folder
      const result = await window.electronAPI.fetchGithubRepoContents({ owner, repo, path: mcVersion });
      
      if (!result.success) {
        throw new Error(result.error);
      }

      const contents = result.data;
      
      // Filter for JSON files
      const jsonFiles = contents.filter(item => 
        item.type === 'file' && item.name.endsWith('.json')
      );

      if (jsonFiles.length === 0) {
        throw new Error(`Nie znaleziono profili JSON dla wersji MC ${mcVersion}`);
      }

      displayProfiles(jsonFiles, mcVersion, owner, repo);
      profilesListContainer.style.display = 'block';
      
    } catch (error) {
      console.error('Błąd ładowania profili:', error);
      window.electronAPI.showErrorMessage({ title: "Błąd ładowania profili", content: error.message });
    } finally {
      loadProfilesButton.disabled = false;
      loadProfilesButton.textContent = 'Załaduj Profile';
    }
  }

  function displayProfiles(jsonFiles, mcVersion, owner, repo) {
    profilesList.innerHTML = '';
    
    jsonFiles.forEach(file => {
      const profileCard = document.createElement('div');
      profileCard.className = 'profile-card';
      
      // Extract profile name from filename (remove .json extension)
      const profileName = file.name.replace('.json', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      profileCard.innerHTML = `
        <div class="profile-card-header">
          <h4>${profileName}</h4>
          <span class="profile-version">${mcVersion}</span>
        </div>
        <p class="profile-description">Profil modów: ${file.name}</p>
        <p class="profile-assets">Rozmiar: ${(file.size / 1024).toFixed(1)} KB</p>
        <button class="btn btn-secondary load-profile-btn" data-file='${JSON.stringify({...file, owner, repo, mcVersion})}'>
          Załaduj Profil
        </button>
      `;
      
      profilesList.appendChild(profileCard);
    });

    // Add event listeners to load profile buttons
    document.querySelectorAll('.load-profile-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const fileData = JSON.parse(e.target.dataset.file);
        await showProfileModsList(fileData);
      });
    });
  }

  async function showProfileModsList(fileData) {
    try {
      // Hide profiles list and show mods list container
      profilesListContainer.style.display = 'none';
      profileModsListContainer.style.display = 'block';
      
      // Reset the preview area
      profileModsPreview.innerHTML = `
        <div class="mods-loading" style="text-align: center; padding: 20px;">
          <div class="loader"></div>
          <p>Pobieranie informacji o modach z profilu "${fileData.name.replace('.json', '')}"...</p>
        </div>
      `;
      
      // Download the JSON file content
      const result = await window.electronAPI.fetchGithubFile({ 
        owner: fileData.owner,
        repo: fileData.repo,
        path: `${fileData.mcVersion}/${fileData.name}`
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      const profileData = JSON.parse(result.data);
      const modIds = profileData.modIds || [];
      
      if (modIds.length === 0) {
        profileModsPreview.innerHTML = `
          <div class="no-mods-message" style="text-align: center; padding: 20px; color: var(--theme-text-dim);">
            <p>Ten profil nie zawiera żadnych modów.</p>
          </div>
        `;
        return;
      }

      // Create header with profile info
      const profileHeader = document.createElement('div');
      profileHeader.className = 'profile-header';
      profileHeader.innerHTML = `
        <div class="profile-info">
          <h5>${profileData.name || fileData.name.replace('.json', '')}</h5>
          <p class="profile-description">${profileData.description || 'Brak opisu'}</p>
          <div class="profile-meta">
            <span class="profile-version">MC ${profileData.mcVersion}</span>
            <span class="profile-loader">${profileData.loader || 'fabric'}</span>
            <span class="profile-mod-count">${modIds.length} modów</span>
          </div>
        </div>
      `;

      // Create mods container
      const modsContainer = document.createElement('div');
      modsContainer.className = 'mods-preview-container';
      
      // Clear loading and add header
      profileModsPreview.innerHTML = '';
      profileModsPreview.appendChild(profileHeader);
      profileModsPreview.appendChild(modsContainer);
      
      // Fetch and display mod information
      for (let index = 0; index < modIds.length; index++) {
        const modId = modIds[index];
        
        try {
          // Get mod info from Modrinth using ID
          const projectResult = await window.electronAPI.fetchModrinthProject({ projectId: modId });
          
          let modInfo = {
            id: modId,
            name: modId, // fallback to ID
            description: 'Brak opisu',
            iconUrl: null,
            downloads: 0,
            categories: []
          };
          
          if (projectResult.success && projectResult.data) {
            modInfo.name = projectResult.data.title || modId;
            modInfo.description = projectResult.data.description || 'Brak opisu';
            modInfo.iconUrl = projectResult.data.icon_url;
            modInfo.downloads = projectResult.data.downloads || 0;
            modInfo.categories = projectResult.data.categories || [];
          }
          
          // Create mod preview item with checkbox
          const modPreviewItem = document.createElement('div');
          modPreviewItem.className = 'mod-preview-item';
          modPreviewItem.innerHTML = `
            <div class="mod-selection-checkbox">
              <input type="checkbox" id="mod-checkbox-${index}" class="mod-checkbox" data-mod-id="${modId}" data-mod-index="${index}" checked>
              <label for="mod-checkbox-${index}" class="checkbox-label"></label>
            </div>
            <div class="mod-preview-header">
              <img src="${modInfo.iconUrl || 'icons/jar.png'}" alt="${modInfo.name}" class="mod-preview-icon" onerror="this.src='icons/jar.png'">
              <div class="mod-preview-info">
                <h6 class="mod-preview-name">${modInfo.name}</h6>
                <p class="mod-preview-description">${modInfo.description.substring(0, 120)}${modInfo.description.length > 120 ? '...' : ''}</p>
                <div class="mod-preview-meta">
                  <span class="mod-preview-downloads">${formatDownloadCount(modInfo.downloads)} pobrań</span>
                  <span class="mod-preview-categories">${modInfo.categories.slice(0, 3).join(', ')}</span>
                </div>
              </div>
            </div>
            <div class="mod-preview-id">
              <span class="mod-id-badge">${modId}</span>
            </div>
          `;
          
          modsContainer.appendChild(modPreviewItem);
          
        } catch (error) {
          console.error(`Błąd pobierania informacji o modzie ${modId}:`, error);
          
          // Create mod item with error state and checkbox
          const modPreviewItem = document.createElement('div');
          modPreviewItem.className = 'mod-preview-item error';
          modPreviewItem.innerHTML = `
            <div class="mod-selection-checkbox">
              <input type="checkbox" id="mod-checkbox-${index}" class="mod-checkbox" data-mod-id="${modId}" data-mod-index="${index}" checked>
              <label for="mod-checkbox-${index}" class="checkbox-label"></label>
            </div>
            <div class="mod-preview-header">
              <img src="icons/jar.png" alt="${modId}" class="mod-preview-icon">
              <div class="mod-preview-info">
                <h6 class="mod-preview-name">${modId}</h6>
                <p class="mod-preview-description">Nie udało się pobrać informacji o tym modzie</p>
                <div class="mod-preview-meta">
                  <span class="mod-preview-downloads">Nieznane</span>
                </div>
              </div>
            </div>
            <div class="mod-preview-id">
              <span class="mod-id-badge">${modId}</span>
            </div>
          `;
          
          modsContainer.appendChild(modPreviewItem);
        }
      }
      
      // Store profile data for later use and show controls
      currentProfile = {
        ...profileData,
        name: profileData.name || fileData.name.replace('.json', ''),
        mcVersion: fileData.mcVersion,
        fileName: fileData.name,
        fileData: fileData
      };
      
      // Show selection controls and update counts
      modSelectionControls.style.display = 'block';
      downloadSelectedModsButton.style.display = 'inline-block';
      updateSelectedModsCount();
      
      // Add event listeners to checkboxes
      setupModCheckboxListeners();
      
    } catch (error) {
      console.error('Błąd wyświetlania listy modów:', error);
      profileModsPreview.innerHTML = `
        <div class="error-message" style="text-align: center; padding: 20px; color: var(--theme-danger);">
          <p>Błąd ładowania profilu: ${error.message}</p>
        </div>
      `;
    }
  }

  function updateSelectedModsCount() {
    const checkboxes = document.querySelectorAll('.mod-checkbox');
    const selectedCheckboxes = document.querySelectorAll('.mod-checkbox:checked');
    
    selectedModsCount.textContent = selectedCheckboxes.length;
    totalModsCount.textContent = checkboxes.length;
    
    // Update button state
    if (selectedCheckboxes.length > 0) {
      downloadSelectedModsButton.disabled = false;
      downloadSelectedModsButton.textContent = `Pobierz Zaznaczone Mody (${selectedCheckboxes.length})`;
    } else {
      downloadSelectedModsButton.disabled = true;
      downloadSelectedModsButton.textContent = 'Pobierz Zaznaczone Mody';
    }
  }

  function setupModCheckboxListeners() {
    const checkboxes = document.querySelectorAll('.mod-checkbox');
    
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', updateSelectedModsCount);
    });
  }

  function selectAllMods() {
    const checkboxes = document.querySelectorAll('.mod-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = true;
    });
    updateSelectedModsCount();
  }

  function deselectAllMods() {
    const checkboxes = document.querySelectorAll('.mod-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    updateSelectedModsCount();
  }

  function getSelectedMods() {
    const selectedCheckboxes = document.querySelectorAll('.mod-checkbox:checked');
    return Array.from(selectedCheckboxes).map(checkbox => ({
      modId: checkbox.dataset.modId,
      index: parseInt(checkbox.dataset.modIndex)
    }));
  }

  async function loadProfileDetails(fileData) {
    try {
      // Download the JSON file content
      const result = await window.electronAPI.fetchGithubFile({ 
        owner: fileData.owner,
        repo: fileData.repo,
        path: `${fileData.mcVersion}/${fileData.name}`
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      const profileData = JSON.parse(result.data);
      
      // Extract profile name from filename
      const profileName = fileData.name.replace('.json', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      currentProfile = {
        ...profileData,
        name: profileName,
        mcVersion: fileData.mcVersion,
        fileName: fileData.name
      };

      await displayProfileDetails(currentProfile);
      profileDetailsContainer.style.display = 'block';

    } catch (error) {
      console.error('Błąd ładowania szczegółów profilu:', error);
      window.electronAPI.showErrorMessage({ title: "Błąd ładowania profilu", content: error.message });
    }
  }

  async function displayProfileDetails(profile) {
    document.getElementById('profileName').textContent = profile.name;
    document.getElementById('profileMcVersion').textContent = profile.mcVersion;
    
    // Use only modIds - ignore mod names
    const modIds = profile.modIds || [];
    document.getElementById('profileModCount').textContent = modIds.length;

    const modsList = document.getElementById('profileModsList');
    modsList.innerHTML = '<h5>Lista modów:</h5>';
    
    if (modIds.length === 0) {
      modsList.innerHTML += '<p>Brak ID modów w profilu. Upewnij się, że profil zawiera pole "modIds" z listą ID modów z Modrinth.</p>';
      return;
    }

    const modsContainer = document.createElement('div');
    modsContainer.className = 'mods-container';
    
    // Show loading message
    modsList.appendChild(modsContainer);
    modsContainer.innerHTML = '<div class="loader" style="margin: 20px auto;"></div><p style="text-align: center;">Pobieranie informacji o modach...</p>';
    
    // Store mod information for later use during download
    profile.modDetails = [];
    
    // Fetch mod names from Modrinth API with better error handling
    for (let index = 0; index < modIds.length; index++) {
      const modId = modIds[index];
      
      try {
        // Get mod info from Modrinth using ID
        const projectResult = await window.electronAPI.fetchModrinthProject({ projectId: modId });
        
        let modInfo = {
          id: modId,
          name: modId, // fallback to ID
          description: 'Brak opisu',
          iconUrl: null,
          downloads: 0
        };
        
        if (projectResult.success && projectResult.data) {
          modInfo.name = projectResult.data.title || modId;
          modInfo.description = projectResult.data.description || 'Brak opisu';
          modInfo.iconUrl = projectResult.data.icon_url;
          modInfo.downloads = projectResult.data.downloads || 0;
        }
        
        profile.modDetails.push(modInfo);
        
        // Create enhanced mod item with more information
        const modItem = document.createElement('div');
        modItem.className = 'mod-item enhanced';
        modItem.innerHTML = `
          <div class="mod-item-header">
            <img src="${modInfo.iconUrl || 'icons/jar.png'}" alt="${modInfo.name}" class="mod-item-icon" onerror="this.src='icons/jar.png'">
            <div class="mod-item-info">
              <span class="mod-name" title="Modrinth ID: ${modId}">${modInfo.name}</span>
              <span class="mod-description">${modInfo.description.substring(0, 100)}${modInfo.description.length > 100 ? '...' : ''}</span>
              <span class="mod-downloads">${formatDownloadCount(modInfo.downloads)} pobrań</span>
            </div>
          </div>
          <div class="mod-item-status">
            <span class="mod-id-badge">${modId}</span>
            <span class="mod-status" id="mod-status-${index}">Gotowy do pobrania</span>
          </div>
        `;
        
        // Replace loading content with actual mod items
        if (index === 0) {
          modsContainer.innerHTML = ''; // Clear loading message
        }
        modsContainer.appendChild(modItem);
        
      } catch (error) {
        console.error(`Błąd pobierania informacji o modzie ${modId}:`, error);
        
        // Store basic info even on error
        profile.modDetails.push({
          id: modId,
          name: modId,
          description: 'Nie udało się pobrać informacji',
          iconUrl: null,
          downloads: 0
        });
        
        // Create mod item with error state
        const modItem = document.createElement('div');
        modItem.className = 'mod-item error';
        modItem.innerHTML = `
          <div class="mod-item-header">
            <img src="icons/jar.png" alt="${modId}" class="mod-item-icon">
            <div class="mod-item-info">
              <span class="mod-name" title="Modrinth ID: ${modId}">${modId}</span>
              <span class="mod-description">Nie udało się pobrać informacji o modzie</span>
              <span class="mod-downloads">Nieznane</span>
            </div>
          </div>
          <div class="mod-item-status">
            <span class="mod-id-badge">${modId}</span>
            <span class="mod-status" id="mod-status-${index}">Błąd informacji</span>
          </div>
        `;
        
        // Replace loading content with actual mod items
        if (index === 0) {
          modsContainer.innerHTML = ''; // Clear loading message
        }
        modsContainer.appendChild(modItem);
      }
    }
    
    modsList.appendChild(modsContainer);
    
    // Update download location info
    updateDownloadLocationInfo();
  }

  function updateDownloadLocationInfo() {
    const targetFolder = getSelectedProfileFolder();
    
    if (targetFolder) {
      const folderName = targetFolder.split(/[/\\]/).pop();
      targetFolderDisplay.textContent = folderName;
      downloadLocationInfo.style.display = 'block';
    } else {
      downloadLocationInfo.style.display = 'none';
    }
  }


  function getSelectedProfileFolder() {
    const mcVersion = minecraftVersionProfile.value;
    const profilesForVersion = groupedProfileFolders[mcVersion] || [];
    
    if (profilesForVersion.length === 1) {
      // Single profile - use it automatically
      return profilesForVersion[0].path;
    } else if (profilesForVersion.length > 1) {
      // Multiple profiles - use selected one
      return profileFolderSelect.value;
    }
    
    return null;
  }

  async function downloadProfile() {
    if (!currentProfile) {
      window.electronAPI.showErrorMessage({ title: "Błąd", content: "Nie wybrano profilu!" });
      return;
    }

    // Get the target folder from selected profile
    const targetFolder = getSelectedProfileFolder();
    
    if (!targetFolder) {
      window.electronAPI.showErrorMessage({ title: "Błąd", content: "Nie można znaleźć profilu Ogulniegi dla tej wersji MC!" });
      return;
    }

    // Use modDetails if available, otherwise fall back to modIds
    const modDetails = currentProfile.modDetails || [];
    const modIds = currentProfile.modIds || [];
    
    if (modIds.length === 0) {
      window.electronAPI.showErrorMessage({ 
        title: "Błąd", 
        content: "Profil nie zawiera ID modów! Upewnij się, że profil ma pole 'modIds' z listą ID modów z Modrinth." 
      });
      return;
    }

    profileDownloadProgress.style.display = 'block';
    downloadProfileButton.disabled = true;
    
    let downloadedCount = 0;
    let skippedCount = 0;
    const totalMods = modIds.length;
    const downloadResults = [];

    for (let i = 0; i < modIds.length; i++) {
      const modId = modIds[i];
      const modInfo = modDetails[i] || { id: modId, name: modId };
      
      try {
        // Update current download display with mod name
        currentDownloadingMod.textContent = `Pobieranie: ${modInfo.name}`;
        const statusElement = document.getElementById(`mod-status-${i}`);
        if (statusElement) {
          statusElement.textContent = 'Wyszukiwanie wersji...';
          statusElement.className = 'mod-status downloading';
        }

        // Get compatible version
        const versionsResult = await window.electronAPI.fetchModrinthProjectVersions({
          projectId: modId,
          gameVersion: currentProfile.mcVersion,
          loader: 'fabric'
        });

        if (!versionsResult.success || versionsResult.data.length === 0) {
          throw new Error(`Brak kompatybilnej wersji dla MC ${currentProfile.mcVersion}`);
        }

        const version = versionsResult.data[0];
        const file = version.files.find(f => f.primary) || version.files[0];

        if (!file) {
          throw new Error(`Brak pliku do pobrania`);
        }

        // Update status to downloading
        if (statusElement) {
          statusElement.textContent = `Pobieranie ${file.filename}...`;
        }

        // Download the mod
        const downloadResult = await window.electronAPI.downloadFile({
          url: file.url,
          directoryPath: targetFolder,
          filename: file.filename
        });

        if (!downloadResult.success) {
          throw new Error(downloadResult.error);
        }

        downloadedCount++;
        const progress = Math.round((downloadedCount / totalMods) * 100);
        profileProgressBar.style.width = `${progress}%`;
        profileProgressText.textContent = `${downloadedCount}/${totalMods} (${progress}%)`;

        // Update status to success
        if (statusElement) {
          statusElement.textContent = `✅ Pobrano: ${file.filename}`;
          statusElement.className = 'mod-status success';
        }

        downloadResults.push({
          modId,
          modName: modInfo.name,
          status: 'success',
          filename: file.filename
        });

      } catch (error) {
        console.error(`Błąd pobierania moda ${modId} (${modInfo.name}):`, error);
        
        // Check if it's a "file already exists" error
        if (error.message.includes('już istnieje') || error.message.includes('anulowane')) {
          skippedCount++;
          const statusElement = document.getElementById(`mod-status-${i}`);
          if (statusElement) {
            statusElement.textContent = `⏭️ Pominięto (plik istnieje)`;
            statusElement.className = 'mod-status skipped';
          }
          
          downloadResults.push({
            modId,
            modName: modInfo.name,
            status: 'skipped',
            error: 'Plik już istnieje'
          });
        } else {
          const statusElement = document.getElementById(`mod-status-${i}`);
          if (statusElement) {
            statusElement.textContent = `❌ Błąd: ${error.message.substring(0, 50)}...`;
            statusElement.className = 'mod-status error';
          }
          
          downloadResults.push({
            modId,
            modName: modInfo.name,
            status: 'error',
            error: error.message
          });
        }
      }
    }

    // Final status update
    const successCount = downloadedCount;
    const errorCount = totalMods - downloadedCount - skippedCount;
    
    currentDownloadingMod.textContent = `Ukończono! ✅ ${successCount} pobrano | ⏭️ ${skippedCount} pominięto | ❌ ${errorCount} błędów`;
    downloadProfileButton.disabled = false;
    
    // Show detailed completion message
    let message = `Pobieranie profilu "${currentProfile.name}" ukończone!\n\n`;
    message += `✅ Pomyślnie pobrano: ${successCount} modów\n`;
    if (skippedCount > 0) message += `⏭️ Pominięto (już istnieją): ${skippedCount} modów\n`;
    if (errorCount > 0) message += `❌ Błędy: ${errorCount} modów\n`;
    message += `\nLokalizacja: ${targetFolder}`;
    
    window.electronAPI.showInfoMessage({ 
      title: "Pobieranie ukończone", 
      content: message
    });
    
    // Log detailed results for debugging
    console.log('Profile download results:', downloadResults);
  }

  async function downloadSelectedMods() {
    const selectedMods = getSelectedMods();
    
    if (selectedMods.length === 0) {
      window.electronAPI.showErrorMessage({ title: "Błąd", content: "Nie zaznaczono żadnych modów do pobrania!" });
      return;
    }

    if (!currentProfile) {
      window.electronAPI.showErrorMessage({ title: "Błąd", content: "Nie wybrano profilu!" });
      return;
    }

    // Get the target folder from selected profile
    const targetFolder = getSelectedProfileFolder();
    
    if (!targetFolder) {
      window.electronAPI.showErrorMessage({ title: "Błąd", content: "Nie można znaleźć profilu Ogulniegi dla tej wersji MC!" });
      return;
    }

    // Hide mod list and show download progress
    profileModsListContainer.style.display = 'none';
    profileDownloadProgress.style.display = 'block';
    
    let downloadedCount = 0;
    let skippedCount = 0;
    const totalMods = selectedMods.length;
    const downloadResults = [];

    // Get mod details from current profile
    const modDetails = currentProfile.modDetails || [];

    for (let i = 0; i < selectedMods.length; i++) {
      const selectedMod = selectedMods[i];
      const modId = selectedMod.modId;
      const originalIndex = selectedMod.index;
      const modInfo = modDetails[originalIndex] || { id: modId, name: modId };
      
      try {
        // Update current download display with mod name
        currentDownloadingMod.textContent = `Pobieranie: ${modInfo.name} (${i + 1}/${totalMods})`;

        // Get compatible version
        const versionsResult = await window.electronAPI.fetchModrinthProjectVersions({
          projectId: modId,
          gameVersion: currentProfile.mcVersion,
          loader: 'fabric'
        });

        if (!versionsResult.success || versionsResult.data.length === 0) {
          throw new Error(`Brak kompatybilnej wersji dla MC ${currentProfile.mcVersion}`);
        }

        const version = versionsResult.data[0];
        const file = version.files.find(f => f.primary) || version.files[0];

        if (!file) {
          throw new Error(`Brak pliku do pobrania`);
        }

        // Download the mod
        const downloadResult = await window.electronAPI.downloadFile({
          url: file.url,
          directoryPath: targetFolder,
          filename: file.filename
        });

        if (!downloadResult.success) {
          throw new Error(downloadResult.error);
        }

        downloadedCount++;
        const progress = Math.round((downloadedCount / totalMods) * 100);
        profileProgressBar.style.width = `${progress}%`;
        profileProgressText.textContent = `${downloadedCount}/${totalMods} (${progress}%)`;

        downloadResults.push({
          modId,
          modName: modInfo.name,
          status: 'success',
          filename: file.filename
        });

      } catch (error) {
        console.error(`Błąd pobierania moda ${modId} (${modInfo.name}):`, error);
        
        // Check if it's a "file already exists" error
        if (error.message.includes('już istnieje') || error.message.includes('anulowane')) {
          skippedCount++;
          
          downloadResults.push({
            modId,
            modName: modInfo.name,
            status: 'skipped',
            error: 'Plik już istnieje'
          });
        } else {
          downloadResults.push({
            modId,
            modName: modInfo.name,
            status: 'error',
            error: error.message
          });
        }
      }
    }

    // Final status update
    const successCount = downloadedCount;
    const errorCount = totalMods - downloadedCount - skippedCount;
    
    currentDownloadingMod.textContent = `Ukończono! ✅ ${successCount} pobrano | ⏭️ ${skippedCount} pominięto | ❌ ${errorCount} błędów`;
    
    // Show detailed completion message
    let message = `Pobieranie wybranych modów z profilu "${currentProfile.name}" ukończone!\n\n`;
    message += `📋 Wybrano: ${totalMods} modów\n`;
    message += `✅ Pomyślnie pobrano: ${successCount} modów\n`;
    if (skippedCount > 0) message += `⏭️ Pominięto (już istnieją): ${skippedCount} modów\n`;
    if (errorCount > 0) message += `❌ Błędy: ${errorCount} modów\n`;
    message += `\nLokalizacja: ${targetFolder}`;
    
    window.electronAPI.showInfoMessage({ 
      title: "Pobieranie ukończone", 
      content: message
    });
    
    // Log detailed results for debugging
    console.log('Selected mods download results:', downloadResults);
    
    // Automatycznie wracamy do wyboru modów po 3 sekundach
    setTimeout(() => {
      profileDownloadProgress.style.display = 'none';
      profileModsListContainer.style.display = 'block';
    }, 3000);
  }

  // Event listeners for mods profile
  closeModsProfileModalButton.addEventListener('click', () => {
    modsProfileModal.classList.remove('active');
    // Reset modal state
    profilesListContainer.style.display = 'none';
    profileModsListContainer.style.display = 'none';
    profileDetailsContainer.style.display = 'none';
    profileDownloadProgress.style.display = 'none';
    modSelectionControls.style.display = 'none';
    currentProfile = null;
    // Reset version inputs
    minecraftVersionProfile.value = '';
    profileSelectionGroup.style.display = 'none';
    profileFolderSelect.value = '';
    downloadSelectedModsButton.style.display = 'none';
  });

  closeAppBtn.addEventListener('click', () => {
    window.electronAPI.closeApp();
  });

  loadProfilesButton.addEventListener('click', loadGithubProfiles);
  downloadProfileButton.addEventListener('click', downloadProfile);

  // Handle new buttons for mod selection
  downloadSelectedModsButton.addEventListener('click', downloadSelectedMods);

  selectAllModsButton.addEventListener('click', selectAllMods);
  deselectAllModsButton.addEventListener('click', deselectAllMods);

  backToProfilesButton.addEventListener('click', () => {
    profileModsListContainer.style.display = 'none';
    profilesListContainer.style.display = 'block';
    modSelectionControls.style.display = 'none';
    downloadSelectedModsButton.style.display = 'none';
    currentProfile = null;
  });

  // Handle MC version selection
  minecraftVersionProfile.addEventListener('change', handleMcVersionChange);
  
  // Handle profile folder selection
  profileFolderSelect.addEventListener('change', () => {
    updateDownloadLocationInfo();
  });

});