import { describe, expect, it } from "vitest";
import { renderWithProviders } from "@/testing/test-utils";
import { RoomDeviceSectionSkeleton } from "../RoomDeviceSectionSkeleton";

describe("RoomDeviceSectionSkeleton Integration Tests", () => {
	it("RoomDeviceSectionSkeleton_Rendered_ShouldShowTwoPulsingPlaceholderCards", () => {
		// Act
		const { container } = renderWithProviders(<RoomDeviceSectionSkeleton />);

		// Assert
		expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
		expect(container.querySelectorAll(".h-44").length).toBe(2);
	});
});
