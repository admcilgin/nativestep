// Every conformance session asks for the conformance core. Once the app has its own shell (its `foundation`),
// the host builds the template's Sample tree (`SampleCore`) for these sessions only, so the tests stay green
// for the whole migration (COMPONENTS.md §6).
import { session, type SessionOptions } from "@nativestep/test";

export const conformance = (options: SessionOptions = {}) =>
  session({ ...options, fixtures: ["_sample/conformance", ...(options.fixtures ?? [])] });
