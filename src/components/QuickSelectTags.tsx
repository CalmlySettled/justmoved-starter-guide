import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { getSubfiltersForCategory } from "@/data/subfilters";

interface QuickSelectTagsProps {
  category: string;
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  type?: "subfilter" | "feature";
  tags?: string[];

  // 🔽 Optional validation props
  required?: boolean; // if true → at least 1 tag required
  minSelected?: number; // minimum tags required
  maxSelected?: number; // maximum tags allowed
  onValidationChange?: (isValid: boolean) => void; // notify parent,
  error?: string;
}

const COMMON_BUSINESS_FEATURES = [
  "Free Parking",
  "Wheelchair Accessible",
  "Outdoor Seating",
  "WiFi Available",
  "Drive-through",
  "Delivery Available",
  "24 Hour Service",
  "Accepts Credit Cards",
  "Pet Friendly",
  "Air Conditioning",
  "Online Ordering",
  "Curbside Pickup",
  "Loyalty Program",
  "Senior Discounts",
  "Student Discounts",
];

const QuickSelectTags: React.FC<QuickSelectTagsProps> = ({
  category,
  selectedTags,
  onTagToggle,
  type = "subfilter",
  tags = [],
  required = false,
  error = "",
}) => {
  const availableTags =
    tags.length > 0
      ? tags
      : type === "subfilter"
        ? getSubfiltersForCategory(category).map((sf) => sf.label)
        : COMMON_BUSINESS_FEATURES;

  if (availableTags.length === 0) return null;

  return (
    <div className="space-y-2">
      {tags.length === 0 && (
        <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
          Quick Select {type === "subfilter" ? "Tags" : "Features"}
          {required && <span className="text-destructive text-xs">*</span>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <Button
              key={tag}
              type="button"
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onTagToggle(tag)}
              className="h-8 text-xs"
            >
              {isSelected ? (
                <>
                  <X className="h-3 w-3 mr-1" />
                  {tag}
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3 mr-1" />
                  {tag}
                </>
              )}
            </Button>
          );
        })}
      </div>

      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
};

export default QuickSelectTags;
