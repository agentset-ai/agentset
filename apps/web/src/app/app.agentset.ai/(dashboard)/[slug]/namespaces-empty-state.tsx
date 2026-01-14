import {
  FoldersIcon,
  // ArrowRightIcon,
  // BadgeDollarSignIcon,
  // BookIcon,
  // GraduationCapIcon,
} from "lucide-react";

import { cn } from "@agentset/ui/cn";

// import { Label } from "@agentset/ui/label";
// import {
//   RadioGroup,
//   RadioGroupItem,
// } from "@agentset/ui/radio-group";

// import { Separator, SeparatorContent } from "@agentset/ui/separator";

// function ExampleCard({
//   icon: Icon,
//   title,
//   description,
//   value,
// }: {
//   icon: React.ElementType;
//   title: string;
//   description: string;
//   value: string;
// }) {
//   return (
//     <div className="relative">
//       <RadioGroupItem
//         value={value}
//         id={value}
//         className="peer sr-only"
//         aria-label={title}
//       />

//       <Label
//         htmlFor={value}
//         className="border-muted hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary flex h-full flex-col items-start gap-0 rounded-md border-2 bg-transparent p-4 text-black"
//       >
//         <Icon className="size-6" />

//         <p className="mt-4">{title}</p>
//         <p className="text-muted-foreground mt-2 mb-4 text-xs">{description}</p>

//         <p className="mt-auto flex items-center gap-2 text-xs">
//           Get Started
//           <ArrowRightIcon className="size-3" />
//         </p>
//       </Label>
//     </div>
//   );
// }

export function NamespacesEmptyState({
  createButton,
}: {
  createButton: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mt-20 flex min-h-[180px] flex-col items-center justify-center",
      )}
    >
      <FoldersIcon className="text-muted-foreground mb-4 size-10" />
      <h3 className="text-lg font-medium">Create your first namespace</h3>
      <p className="text-muted-foreground mt-0.5 text-sm">
        Create a new namespace to start uploading your data
      </p>
      <div className="mt-4">{createButton}</div>

      {/* TODO: bring these back when we have examples */}
      {/* <Separator className="my-10 max-w-xl">
        <SeparatorContent className="uppercase">
          Or start with a template
        </SeparatorContent>
      </Separator>

      <RadioGroup className="max-w-2xl grid-cols-3">
        <ExampleCard
          icon={GraduationCapIcon}
          title="Research Paper"
          description='Ingest "Attention Is All You Need" by Vaswani et al. and see how Agentset handles complex diagrams and images.'
          value="education"
        />

        <ExampleCard
          icon={BadgeDollarSignIcon}
          title="Financial Report"
          description="Ingest a financial report from a company like Apple and see how Agentset handles tabular data."
          value="financial"
        />

        <ExampleCard
          icon={BookIcon}
          title="Documentation"
          description="See how Agentset handles documentation with code blocks and images."
          value="documentation"
        />
      </RadioGroup> */}
    </div>
  );
}
