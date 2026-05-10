declare module '@babel/generator' {
  import * as types from '@babel/types';
  
  interface GeneratorOptions {
    [key: string]: any;
  }
  
  interface GeneratorResult {
    code: string;
    map?: any;
  }
  
  const generate: {
    (
      ast: types.Node,
      opts?: GeneratorOptions,
      code?: string
    ): GeneratorResult;
    default(
      ast: types.Node,
      opts?: GeneratorOptions,
      code?: string
    ): GeneratorResult;
  };
  
  export default generate;
}
