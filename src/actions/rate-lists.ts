'use server';

import prisma from '@/lib/db';
import { revalidatePath } from 'next/cache';
import type { ActionResult, RateListData, RateItem } from '@/types/types';

export async function getRateLists(): Promise<RateListData[]> {
  try {
    const rateLists = await prisma.rateList.findMany({
      orderBy: { createdAt: 'desc' },
    });
    
    // Parse and convert the JSON rates to RateItem[]
    return rateLists.map(list => {
      try {
     
        
        // Handle cases where rates is already an object
        let parsedRates;
        if (typeof list.rates === 'string') {
          parsedRates = JSON.parse(list.rates);
        } else if (Array.isArray(list.rates)) {
          parsedRates = list.rates;
        } else if (typeof list.rates === 'object' && list.rates !== null) {
          parsedRates = list.rates;
        } else {
          parsedRates = [];
        }

        const typedRates = Array.isArray(parsedRates)
          ? parsedRates.map((rate: any) => ({
              title: String(rate.title || ''),
              value: String(rate.value || '')
            }))
          : [];

        return {
          ...list,
          rates: typedRates,
        };
      } catch (parseError) {
        console.error(`Error parsing rates for list ${list.id}:`, parseError);
        console.error('Problematic rates value:', list.rates);
        return {
          ...list,
          rates: [],
        };
      }
    });
  } catch (error) {
    console.error('Error fetching rate lists:', error);
    throw new Error('Failed to fetch rate lists');
  }
}

export async function createRateList(
  data: Omit<RateListData, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<ActionResult<RateListData>> {
  try {
    const rateList = await prisma.rateList.create({
      data: {
        title: data.title,
        rates: JSON.stringify(data.rates),
        isActive: data.isActive,
      },
    });

    revalidatePath('/dashboard/rate-lists');

    return {
      success: true,
      message: 'Rate list created successfully',
      data: {
        ...rateList,
        rates: Array.isArray(data.rates) ? data.rates : [],
      },
    };
  } catch (error) {
    console.error('Error creating rate list:', error);
    throw new Error('Failed to create rate list');
  }
}

export async function updateRateList(
  id: string,
  data: Partial<Omit<RateListData, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<ActionResult<RateListData>> {
  try {
    const rateList = await prisma.rateList.update({
      where: { id },
      data: {
        title: data.title,
        rates: data.rates ? JSON.stringify(data.rates) : undefined,
        isActive: data.isActive,
      },
    });

    revalidatePath('/dashboard/rate-lists');

    // Parse the JSON rates back to RateItem[]
    const parsedRates = rateList.rates ? JSON.parse(String(rateList.rates)) : [];
    const typedRates = Array.isArray(parsedRates)
      ? parsedRates.map((rate: any) => ({
          title: String(rate.title || ''),
          value: String(rate.value || '')
        }))
      : [];

    return {
      success: true,
      message: 'Rate list updated successfully',
      data: {
        ...rateList,
        rates: typedRates,
      },
    };
  } catch (error) {
    console.error('Error updating rate list:', error);
    throw new Error('Failed to update rate list');
  }
}

export async function deleteRateList(id: string): Promise<ActionResult> {
  try {
    await prisma.rateList.delete({ where: { id } });
    revalidatePath('/dashboard/rate-lists');
    return {
      success: true,
      variant: 'success',
      message: 'لیست نرخ با موفقیت حذف شد',
    };
  } catch (error) {
    console.error('Error deleting rate list:', error);
    return {
      success: false,
      variant: 'destructive',
      message: 'خطا در حذف لیست نرخ',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
