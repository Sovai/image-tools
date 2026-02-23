<script lang="ts">import { UploadCloud } from "lucide-svelte"; let fileInput: any;</script>
<div role="button" tabindex="0" onclick={() => fileInput?.click()} onkeydown={(e) => e.key === "Enter" && fileInput?.click()} ondrop={() => {}} ondragover={() => {}}><UploadCloud /></div>
