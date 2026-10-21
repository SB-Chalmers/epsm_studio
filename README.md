# epsm_studio

[![CI](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)](https://github.com/SB-Chalmers/epsm_studio/actions/workflows/ci.yml) [![Releases](https://img.shields.io/badge/releases-GitHub-181717?logo=github&logoColor=white)](https://github.com/SB-Chalmers/epsm_studio/releases) [![Issues](https://img.shields.io/badge/issues-GitHub-181717?logo=github&logoColor=white)](https://github.com/SB-Chalmers/epsm_studio/issues)

EPSM Studio is a web workspace for building models, scenario studies and results.
The current frontend prototype lets you explore the workflow with demonstration
data and browser storage. Authentication, weather and calculations are illustrative;
the production backend and scientific execution are planned.

## Getting started

Use Node.js 22.12 or newer and npm. Clone the repository to begin:

```sh
git clone https://github.com/SB-Chalmers/epsm_studio.git
cd epsm_studio
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite and use the demo login. Projects and drafts are
saved in this browser. Map tiles need internet access; the prototype runs without
a database, server credentials or Python environment.

Run `npm test` and `npm run build` from `frontend/` to check the application.

## Documentation

- [Frontend setup and checks](frontend/README.md)
- [Prototype capabilities and limits](docs/rebuild/frontend-prototype.md)
- [Architecture and delivery plan](docs/rebuild/plan.md)
- [Design manual](docs/design/README.md)
- [Detailed guide and contributing](docs/guide.md)

## License

EPSM-owned source uses the [MIT license](LICENSE.md). Bundled fonts and Viewer
assets retain their own licenses and provenance in the design kit and `frontend/vendor/`.

Developed at Chalmers University of Technology. Lead developer: Sanjay Somanath;
principal investigator: Alexander Hollberg; contributor: Yinan Yu. Funded by the
Swedish Energy Agency, project P2024-04053, with Lindholmen Science Park AB,
Sinom AB and Stiftelsen Chalmers Industriteknik.
