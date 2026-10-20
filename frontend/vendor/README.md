# EPSM Viewer dependency

`epsm_viewer-0.1.0.tgz` is the actual local EPSM Viewer npm artifact, pinned by version and SHA256 in the adjacent provenance manifest. Studio installs this repository-local tarball; it does not depend on a sibling checkout at runtime. The archive retains MIT and Three.js notices. No Viewer source was edited for this integration.

The manifest records the source commit, source digest, pre-existing working-tree documentation differences and verification. Rebuild the artifact deliberately when updating the viewer; do not replace it without updating provenance and the lockfile.

Studio converts its illustrative building drafts into neutral `epsm.scene/1` massing in its own adapter. Viewer triangulates and renders it. This demo massing is not a Core physical model or evidence of engine readiness.
