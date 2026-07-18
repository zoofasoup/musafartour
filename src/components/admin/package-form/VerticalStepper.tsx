import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  id: number;
  title: string;
  description?: string;
}

interface VerticalStepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export const VerticalStepper: React.FC<VerticalStepperProps> = ({ steps, currentStep, onStepClick }) => {
  return (
    <div className="flex flex-col space-y-0 relative">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="relative group">
            {/* Vertical Line Connector */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-5 top-10 bottom-[-0.75rem] w-[2px] -translate-x-1/2",
                  isCompleted ? "bg-primary" : "bg-primary/20"
                )}
              />
            )}
            
            <div 
              className={cn(
                "flex items-start gap-4 py-3 relative z-10", 
                onStepClick ? "cursor-pointer" : "cursor-default"
              )}
              onClick={() => onStepClick && onStepClick(step.id)}
            >
              {/* Circle */}
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors bg-white",
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : isActive
                    ? "border-primary text-primary"
                    : "border-primary/20 text-muted-foreground group-hover:border-primary/50"
                )}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : step.id}
              </div>
              
              {/* Text */}
              <div className="flex flex-col pt-2">
                <span
                  className={cn(
                    "text-sm font-semibold tracking-tight transition-colors",
                    isActive ? "text-foreground" : isCompleted ? "text-foreground/80" : "text-muted-foreground group-hover:text-foreground/70"
                  )}
                >
                  {step.title}
                </span>
                {step.description && (
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
