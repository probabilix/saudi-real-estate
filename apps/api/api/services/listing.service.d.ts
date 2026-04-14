import { ListingSearchInput } from '@saudi-re/shared';
export declare class ListingService {
    /**
     * Search and filter listings
     */
    static searchListings(filters: ListingSearchInput & {
        ownerId?: string;
        firmId?: string;
    }): Promise<{
        items: {
            status: "ACTIVE" | "SOLD" | "RENTED" | "DRAFT" | "FLAGGED" | null;
            city: string;
            type: "APARTMENT" | "VILLA" | "FLOOR" | "RESIDENTIAL_BUILDING" | "RESIDENTIAL_LAND" | "REST_HOUSE" | "CHALET" | "ROOM" | "TOWNHOUSE" | "DUPLEX" | "OFFICE" | "COMMERCIAL_BUILDING" | "WAREHOUSE" | "COMMERCIAL_LAND" | "INDUSTRIAL_LAND" | "FARM" | "AGRICULTURE_PLOT" | "COMPLEX" | "HOTEL" | "WORKSHOP" | "FACTORY" | "SCHOOL" | "HEALTH_CENTER" | "GAS_STATION" | "SHOWROOM";
            purpose: "SALE" | "RENT" | "LEASE";
            bedrooms: number | null;
            foreignerEligible: boolean | null;
            isFeatured: boolean | null;
            id: string;
            createdAt: Date | null;
            updatedAt: Date | null;
            ownerId: string;
            district: string | null;
            lat: string | null;
            lng: string | null;
            price: number;
            areaSqm: string | null;
            bathrooms: number | null;
            floor: number | null;
            arTitle: string;
            arDescription: string | null;
            enTitle: string | null;
            enDescription: string | null;
            translationStatus: "PENDING" | "DONE" | "FAILED" | null;
            photos: string[];
            amenities: unknown;
            history: unknown;
            isFreehold: boolean | null;
            regaAdvertisingLicense: string | null;
            regaFalLicense: string | null;
            regaLicenseIssueDate: string | null;
            regaLicenseExpiryDate: string | null;
            locationDescriptionDeedAr: string | null;
            propertyAge: number | null;
            furnishingStatus: "UNFURNISHED" | "PARTLY_FURNISHED" | "FULLY_FURNISHED" | null;
            completionStatus: "READY" | "OFF_PLAN" | "UNDER_CONSTRUCTION" | null;
            residenceType: "FAMILY" | "BACHELOR" | null;
            regaVerifiedAt: Date | null;
            featuredUntil: Date | null;
            verified: boolean | null;
            mandateDocUrl: string | null;
            viewsCount: number | null;
            searchVector: string | null;
            deletedAt: Date | null;
            owner: {
                name: string | null;
                id: string;
                role: "ADMIN" | "FIRM" | "AGENT" | "SOLO_BROKER" | "OWNER" | "BUYER";
                regaVerified: boolean | null;
                avatarUrl: string | null;
            };
        }[];
        hasMore: boolean;
        nextCursor: string | null;
    }>;
    /**
     * Get a single listing by ID with owner details
     */
    static getListingById(id: string): Promise<{
        status: "ACTIVE" | "SOLD" | "RENTED" | "DRAFT" | "FLAGGED" | null;
        city: string;
        type: "APARTMENT" | "VILLA" | "FLOOR" | "RESIDENTIAL_BUILDING" | "RESIDENTIAL_LAND" | "REST_HOUSE" | "CHALET" | "ROOM" | "TOWNHOUSE" | "DUPLEX" | "OFFICE" | "COMMERCIAL_BUILDING" | "WAREHOUSE" | "COMMERCIAL_LAND" | "INDUSTRIAL_LAND" | "FARM" | "AGRICULTURE_PLOT" | "COMPLEX" | "HOTEL" | "WORKSHOP" | "FACTORY" | "SCHOOL" | "HEALTH_CENTER" | "GAS_STATION" | "SHOWROOM";
        purpose: "SALE" | "RENT" | "LEASE";
        bedrooms: number | null;
        foreignerEligible: boolean | null;
        isFeatured: boolean | null;
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        ownerId: string;
        district: string | null;
        lat: string | null;
        lng: string | null;
        price: number;
        areaSqm: string | null;
        bathrooms: number | null;
        floor: number | null;
        arTitle: string;
        arDescription: string | null;
        enTitle: string | null;
        enDescription: string | null;
        translationStatus: "PENDING" | "DONE" | "FAILED" | null;
        photos: string[];
        amenities: unknown;
        history: unknown;
        isFreehold: boolean | null;
        regaAdvertisingLicense: string | null;
        regaFalLicense: string | null;
        regaLicenseIssueDate: string | null;
        regaLicenseExpiryDate: string | null;
        locationDescriptionDeedAr: string | null;
        propertyAge: number | null;
        furnishingStatus: "UNFURNISHED" | "PARTLY_FURNISHED" | "FULLY_FURNISHED" | null;
        completionStatus: "READY" | "OFF_PLAN" | "UNDER_CONSTRUCTION" | null;
        residenceType: "FAMILY" | "BACHELOR" | null;
        regaVerifiedAt: Date | null;
        featuredUntil: Date | null;
        verified: boolean | null;
        mandateDocUrl: string | null;
        viewsCount: number | null;
        searchVector: string | null;
        deletedAt: Date | null;
        owner: {
            name: string | null;
            id: string;
            email: string;
            phone: string | null;
            passwordHash: string;
            role: "ADMIN" | "FIRM" | "AGENT" | "SOLO_BROKER" | "OWNER" | "BUYER";
            firmId: string | null;
            googleId: string | null;
            regaLicence: string | null;
            regaVerified: boolean | null;
            subscriptionTier: "FREE" | "STARTER" | "PRO" | "ELITE" | null;
            subscriptionUntil: Date | null;
            avatarUrl: string | null;
            verificationStatus: "PENDING" | "UNVERIFIED" | "VERIFIED" | "REJECTED" | null;
            isActive: boolean | null;
            createdAt: Date | null;
            updatedAt: Date | null;
            brokerProfile: {
                gender: "MALE" | "FEMALE" | null;
                id: string;
                createdAt: Date | null;
                updatedAt: Date | null;
                userId: string;
                titleEn: string | null;
                titleAr: string | null;
                bioEn: string | null;
                bioAr: string | null;
                whatsapp: string | null;
                nationalId: string | null;
                regaLicenseNumber: string | null;
                experienceLevel: "0-2" | "3-5" | "6-10" | "10+" | null;
                languages: string[] | null;
                serviceAreas: string[] | null;
                nationalShortAddress: string | null;
                address: string | null;
            };
            firm: {
                name: string | null;
                id: string;
                email: string;
                phone: string | null;
                passwordHash: string;
                role: "ADMIN" | "FIRM" | "AGENT" | "SOLO_BROKER" | "OWNER" | "BUYER";
                firmId: string | null;
                googleId: string | null;
                regaLicence: string | null;
                regaVerified: boolean | null;
                subscriptionTier: "FREE" | "STARTER" | "PRO" | "ELITE" | null;
                subscriptionUntil: Date | null;
                avatarUrl: string | null;
                verificationStatus: "PENDING" | "UNVERIFIED" | "VERIFIED" | "REJECTED" | null;
                isActive: boolean | null;
                createdAt: Date | null;
                updatedAt: Date | null;
            } | null;
        };
    } | undefined>;
    /**
     * Get count of listings for a user or firm by status
     */
    static getListingsCount(params: {
        ownerId?: string;
        firmId?: string;
        status?: string | string[];
    }): Promise<number>;
}
//# sourceMappingURL=listing.service.d.ts.map