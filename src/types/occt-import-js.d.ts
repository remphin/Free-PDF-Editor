declare module 'occt-import-js' {
  export interface OcctMeshAttribute {
    array: number[] | Float32Array;
  }

  export interface OcctMesh {
    name?: string;
    color?: [number, number, number];
    brep_faces?: Array<{
      first: number;
      last: number;
      color?: [number, number, number] | null;
    }>;
    attributes: {
      position: OcctMeshAttribute;
      normal?: OcctMeshAttribute;
    };
    index: {
      array: number[] | Uint32Array | Uint16Array;
    };
  }

  export interface OcctImportResult {
    success: boolean;
    root?: {
      name?: string;
      meshes: number[];
      children: Array<{
        name?: string;
        meshes: number[];
        children: unknown[];
      }>;
    };
    meshes: OcctMesh[];
  }

  export interface OcctImportInstance {
    ReadStepFile(content: Uint8Array, params?: Record<string, unknown> | null): OcctImportResult;
    ReadIgesFile(content: Uint8Array, params?: Record<string, unknown> | null): OcctImportResult;
    ReadBrepFile(content: Uint8Array, params?: Record<string, unknown> | null): OcctImportResult;
  }

  export default function occtimportjs(moduleArg?: {
    locateFile?: (path: string, scriptDirectory: string) => string;
  }): Promise<OcctImportInstance>;
}
