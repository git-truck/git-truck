//@ts-ignore
import gitcolors from 'github-colors';
import {
    HydratedGitBlobObject,
  } from "./../../parser/src/model"


export function GetFileColor(blob : HydratedGitBlobObject) : string {
    return gitcolors.ext(blob.name.substring(blob.name.lastIndexOf('.')+1));
}

class SpectrumTranslator {
    readonly scale : number;
    readonly offset : number;
    readonly target_max : number;
    readonly target_min : number;

    constructor(input_min : number, input_max : number, target_min : number, target_max : number) {
        this.scale = (target_max - target_min) / (input_max - input_min);
        this.offset = (input_min * this.scale) - target_min;
        this.target_max = target_max;
        this.target_min = target_min;
    }

    Translate(input : number) {
        console.log((input * this.scale) - this.offset);
        return (input * this.scale) - this.offset;
    }

    InverseTranslate(input : number) {
        (this.target_max - (this.Translate(input))) + this.target_min;
    }
}

export class ColdMapTranslator {
    readonly translator : SpectrumTranslator;
    readonly min_lightness = 50;
    readonly max_lightness = 80;

    constructor(min : number, max : number) {
        this.translator = new SpectrumTranslator(min, max, this.min_lightness, this.max_lightness);
    }

    GetColor(blob : HydratedGitBlobObject) : string {
        console.log(`hsl(230,65%,${this.translator.Translate(blob.noCommits)}%)`);
        
        return `hsl(230,65%,${this.translator.Translate(blob.noCommits)}%)`;
    }
}

export class HeatMapTranslator {
    readonly translator : SpectrumTranslator;
    readonly min_lightness = 50;
    readonly max_lightness = 80;

    constructor(min : number, max : number) {
        this.translator = new SpectrumTranslator(min, max, this.min_lightness, this.max_lightness);
    }

    GetColor(blob : HydratedGitBlobObject) : string {
        return `hsl(3,65%,${this.translator.InverseTranslate(blob.noCommits)}%)`;
    }
}

