import { Test } from "@nestjs/testing";
import type { TestingModule } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { PreparationSuggestionsController } from "./preparation-suggestions.controller";
import { CatalogService } from "./catalog.service";
import type {
  CreatePreparationSuggestionDto,
  QueryPreparationSuggestionsDto,
  UpdatePreparationSuggestionDto,
} from "./dto/catalog.dto";

describe(PreparationSuggestionsController.name, () => {
  let controller: PreparationSuggestionsController;
  let catalogService: {
    listPreparationSuggestions: ReturnType<typeof vi.fn>;
    listPreparationSuggestionsAdmin: ReturnType<typeof vi.fn>;
    createPreparationSuggestion: ReturnType<typeof vi.fn>;
    updatePreparationSuggestion: ReturnType<typeof vi.fn>;
    deletePreparationSuggestion: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    catalogService = {
      listPreparationSuggestions: vi.fn(),
      listPreparationSuggestionsAdmin: vi.fn(),
      createPreparationSuggestion: vi.fn(),
      updatePreparationSuggestion: vi.fn(),
      deletePreparationSuggestion: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PreparationSuggestionsController],
      providers: [
        {
          provide: CatalogService,
          useValue: catalogService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PreparationSuggestionsController>(PreparationSuggestionsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should list active suggestions", async () => {
    const query: QueryPreparationSuggestionsDto = { q: "salt" };
    catalogService.listPreparationSuggestions.mockResolvedValue([{ id: "1", text: "Mild salt" }]);

    const result = await controller.list(query);
    expect(result).toEqual([{ id: "1", text: "Mild salt" }]);
    expect(catalogService.listPreparationSuggestions).toHaveBeenCalledWith(query);
  });

  it("should list suggestions for admin", async () => {
    const query: QueryPreparationSuggestionsDto = { q: "suya" };
    catalogService.listPreparationSuggestionsAdmin.mockResolvedValue([
      { id: "2", text: "Extra spicy" },
    ]);

    const result = await controller.listAdmin(query);
    expect(result).toEqual([{ id: "2", text: "Extra spicy" }]);
    expect(catalogService.listPreparationSuggestionsAdmin).toHaveBeenCalledWith(query);
  });

  it("should create suggestion", async () => {
    const dto: CreatePreparationSuggestionDto = { text: "No onions" };
    catalogService.createPreparationSuggestion.mockResolvedValue({ id: "3", text: "No onions" });

    const result = await controller.create(dto);
    expect(result).toEqual({ id: "3", text: "No onions" });
    expect(catalogService.createPreparationSuggestion).toHaveBeenCalledWith(dto);
  });

  it("should update suggestion", async () => {
    const dto: UpdatePreparationSuggestionDto = { text: "Less sugar" };
    catalogService.updatePreparationSuggestion.mockResolvedValue({ id: "3", text: "Less sugar" });

    const result = await controller.update("3", dto);
    expect(result).toEqual({ id: "3", text: "Less sugar" });
    expect(catalogService.updatePreparationSuggestion).toHaveBeenCalledWith("3", dto);
  });

  it("should delete suggestion", async () => {
    catalogService.deletePreparationSuggestion.mockResolvedValue({ deleted: true });

    const result = await controller.delete("3");
    expect(result).toEqual({ deleted: true });
    expect(catalogService.deletePreparationSuggestion).toHaveBeenCalledWith("3");
  });
});
