/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

package controller

import (
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

// GetProvinces 获取省份列表
func GetProvinces(c *gin.Context) {
	var provinces []model.Province
	if err := model.DB.Order("id asc").Find(&provinces).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, provinces)
}

// GetCitiesByProvince 根据省份ID获取城市列表
func GetCitiesByProvince(c *gin.Context) {
	provinceId, err := strconv.Atoi(c.Param("provinceId"))
	if err != nil || provinceId <= 0 {
		common.ApiErrorMsg(c, "无效的省份ID")
		return
	}
	var cities []model.City
	if err := model.DB.Where("province_id = ?", provinceId).Order("id asc").Find(&cities).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, cities)
}

// GetDistrictsByCity 根据城市ID获取区县列表
func GetDistrictsByCity(c *gin.Context) {
	cityId, err := strconv.Atoi(c.Param("cityId"))
	if err != nil || cityId <= 0 {
		common.ApiErrorMsg(c, "无效的城市ID")
		return
	}
	var districts []model.District
	if err := model.DB.Where("city_id = ?", cityId).Order("id asc").Find(&districts).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, districts)
}
