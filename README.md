# Ogulniega Mod Manager v2

Prosty i intuicyjny menedżer modów do gry Minecraft, stworzony przy użyciu Electron. Aplikacja umożliwia łatwe przeglądanie, pobieranie i zarządzanie modyfikacjami z najpopularniejszych źródeł, a także obsługę lokalnych profili modów.

## Główne Funkcje

- **Wiele źródeł:** Pobieraj mody i shadery z **Modrinth** oraz **CurseForge**.
- **Domyślne Mody:** Zarządzaj lokalnymi modami przechowywanymi w folderach profili Ogulniega.
- **Włączanie/Wyłączanie Modów:** Aktywuj lub deaktywuj mody jednym kliknięciem, bez potrzeby ich usuwania. Zmiana stanu polega na ukrywaniu plików (w systemie Windows) lub zmianie nazwy (na innych systemach).
- **Profile Modów z GitHub:** Wczytuj i pobieraj predefiniowane listy modów z publicznych repozytoriów na GitHub.
- **Filtrowanie Wersji:** Wybierz wersję Minecrafta, a aplikacja automatycznie przefiltruje kompatybilne mody.
- **Prosty Interfejs:** Czysty i łatwy w obsłudze interfejs użytkownika.

## Instalacja

Aby uruchomić projekt lokalnie, postępuj zgodnie z poniższymi krokami:

1.  **Sklonuj repozytorium:**
    ```bash
    git clone <adres-repozytorium>
    cd "Ogulniega Mod Manager v2"
    ```

2.  **Zainstaluj zależności:**

    Upewnij się, że masz zainstalowane [Node.js](https://nodejs.org/). Następnie wykonaj polecenie:
    ```bash
    npm install
    ```

## Uruchamianie

Aby uruchomić aplikację w trybie deweloperskim, użyj polecenia:

```bash
npm start
```

## Technologie

- **Framework:** [Electron](https://www.electronjs.org/)
- **Języki:** JavaScript, HTML, CSS
- **Środowisko uruchomieniowe:** [Node.js](https://nodejs.org/)
- **API:** Modrinth API, CurseForge API, GitHub API
