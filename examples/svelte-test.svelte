<script>
  import { usedConstant } from './unused/source'; // Reusing existing source
  export let prop1;
  const localConst = 10;
</script>
<div>
  <h1>Hello {prop1}</h1>
</div>
