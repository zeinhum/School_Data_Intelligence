

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolResultSystem.Web.Areas.Analytics.Models;
using SchoolResultSystem.Web.Areas.Analytics.Services;
using SchoolResultSystem.Web.Data;
using SchoolResultSystem.Web.Filters;
using SchoolResultSystem.Web.Models;
using System.Linq;

namespace SchoolResultSystem.Web.Areas.Analytics.Controllers
{
    [Area("Analytics")]
    [AuthorizeUser]
    public class AnalyticController(ApiRouter router) : Controller
    {

        [HttpPost]
        public async Task<IActionResult> Dispatch([FromBody] ApiRequest request)
        {
            if (request == null)
                return BadRequest(ApiResponse.Fail("Request cannot be null."));

            var response = await router.Map(request);  

            if (!response.Success)
                return BadRequest(response);
            if(request.JsonRequired)
                return Ok(response.Data);
            
            return PartialView($"_{request.ApiAction}", response.Data);
        }
    }
}
