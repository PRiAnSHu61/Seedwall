import type { AnyGenerator, Generator, Params } from "./types";
import { cuttingMat } from "./cutting-mat";
import { meshGradient } from "./mesh-gradient";
import { topographic } from "./topographic";
import { blueprint } from "./blueprint";
import { terminal } from "./terminal";
import { pixelDither } from "./pixel-dither";
import { geometric } from "./geometric";
import { aurora } from "./aurora";
import { minimalType } from "./minimal-type";
import { flowField } from "./flow-field";
import { waveLines } from "./wave-lines";
import { landscape } from "./landscape";
import { truchet } from "./truchet";
import { gitGraph } from "./git-graph";
import { circuit } from "./circuit";
import { halftone } from "./halftone";
import { spirograph } from "./spirograph";
import { codeCity } from "./code-city";
import { marble } from "./marble";
import { contributions } from "./contributions";
import { cymatics } from "./cymatics";
import { quasicrystal } from "./quasicrystal";
import { eventHorizon } from "./event-horizon";
import { attractor } from "./attractor";
import { opArt } from "./op-art";
import { seedHead } from "./seed-head";
import { trinetra } from "./trinetra";
import { jyotirlinga } from "./jyotirlinga";
import { sudarshan } from "./sudarshan";
import { padmanabha } from "./padmanabha";
import { dhruva } from "./dhruva";
import { kintsugi } from "./kintsugi";
import { ascent } from "./ascent";
import { clockwork } from "./clockwork";

/** Erase a generator's param type for storage in the registry. */
const reg = <P extends Params>(g: Generator<P>): AnyGenerator => g as unknown as AnyGenerator;

/** Every generator on the site, CLI and tests. Add a look = add a file + one line here. */
export const GENERATORS: readonly AnyGenerator[] = [
  reg(cuttingMat),
  reg(meshGradient),
  reg(topographic),
  reg(blueprint),
  reg(terminal),
  reg(pixelDither),
  reg(geometric),
  reg(aurora),
  reg(minimalType),
  reg(flowField),
  reg(waveLines),
  reg(landscape),
  reg(truchet),
  reg(gitGraph),
  reg(contributions),
  reg(circuit),
  reg(halftone),
  reg(spirograph),
  reg(codeCity),
  reg(marble),
  reg(eventHorizon),
  reg(cymatics),
  reg(attractor),
  reg(quasicrystal),
  reg(opArt),
  reg(seedHead),
  reg(trinetra),
  reg(jyotirlinga),
  reg(sudarshan),
  reg(padmanabha),
  reg(dhruva),
  reg(kintsugi),
  reg(ascent),
  reg(clockwork),
];

export function getGenerator(id: string): AnyGenerator | undefined {
  return GENERATORS.find((g) => g.id === id);
}

export * from "./render";
export type { AnyGenerator, Generator, Params, ParamValue, Preset, Size } from "./types";
